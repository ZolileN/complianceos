import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { logAuditAction } from '@/lib/auditLogger';
import { sendVerificationCode, normaliseToE164 } from '@/lib/twilio';

/**
 * POST /api/settings/whatsapp/connect
 *
 * Accepts { phoneNumber } and connects Twilio WhatsApp for the tenant.
 *
 * OTP via Twilio Verify is the intended production path.
 * Set TWILIO_SKIP_OTP=true to bypass Verify during sandbox/trial testing.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = (session.user as { tenantId: string }).tenantId;
  const userRole = (session.user as { role: string }).role;
  if (!tenantId) {
    return NextResponse.json({ error: 'No profile' }, { status: 403 });
  }

  if (userRole !== 'administrator' && userRole !== 'operations_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { phoneNumber } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const e164Number = normaliseToE164(phoneNumber);
    const skipOtp = process.env.TWILIO_SKIP_OTP === 'true';

    // Testing bypass: mark connected without Twilio Verify SMS
    if (skipOtp) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          whatsappPhoneNumber: e164Number,
          whatsappProvider: 'twilio',
          whatsappSetupComplete: true,
          whatsappVerifiedName: e164Number,
        },
      });

      await logAuditAction({
        tenantId,
        userId: (session.user as { id: string }).id,
        action: 'UPDATE',
        entityType: 'Tenant',
        entityId: tenantId,
        details: {
          action: 'WhatsApp Twilio Connect — OTP bypassed (TWILIO_SKIP_OTP)',
          phoneNumber: e164Number,
        },
      });

      return NextResponse.json({
        success: true,
        connected: true,
        skippedOtp: true,
        phoneNumber: e164Number,
        message: 'WhatsApp connected (OTP verification bypassed for testing).',
      });
    }

    const verifyStatus = await sendVerificationCode(e164Number);

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        whatsappPhoneNumber: e164Number,
        whatsappProvider: 'twilio',
      },
    });

    await logAuditAction({
      tenantId,
      userId: (session.user as { id: string }).id,
      action: 'UPDATE',
      entityType: 'Tenant',
      entityId: tenantId,
      details: { action: 'WhatsApp Twilio Connect — OTP Sent', phoneNumber: e164Number },
    });

    return NextResponse.json({
      success: true,
      connected: false,
      skippedOtp: false,
      status: verifyStatus,
      phoneNumber: e164Number,
      message: 'Verification code sent. Please check your phone for the OTP.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error during connection';
    console.error('WhatsApp Twilio connect error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
