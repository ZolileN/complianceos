import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { logAuditAction } from '@/lib/auditLogger';
import { sendVerificationCode, normaliseToE164, stripWhatsAppPrefix } from '@/lib/twilio';

/**
 * OTP is skipped when:
 * - TWILIO_SKIP_OTP=true, or
 * - NODE_ENV=development (local sandbox testing)
 *
 * Force OTP even in development with TWILIO_REQUIRE_OTP=true.
 */
function shouldSkipOtp(): boolean {
  if (process.env.TWILIO_REQUIRE_OTP === 'true') return false;
  if (process.env.TWILIO_SKIP_OTP === 'true') return true;
  return process.env.NODE_ENV === 'development';
}

/**
 * POST /api/settings/whatsapp/connect
 *
 * Accepts { phoneNumber } and connects Twilio WhatsApp for the tenant.
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
    const skipOtp = shouldSkipOtp();

    // For sandbox, inbound webhooks arrive on TWILIO_WHATSAPP_NUMBER — store that
    // for routing, and keep the user's number as the verified display name.
    const sandboxRaw = process.env.TWILIO_WHATSAPP_NUMBER || '';
    const routingNumber = sandboxRaw
      ? normaliseToE164(stripWhatsAppPrefix(sandboxRaw))
      : e164Number;

    if (skipOtp) {
      console.log(
        `[WhatsApp connect] OTP skipped (TWILIO_SKIP_OTP=${process.env.TWILIO_SKIP_OTP}, NODE_ENV=${process.env.NODE_ENV})`
      );

      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          whatsappPhoneNumber: routingNumber,
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
          action: 'WhatsApp Twilio Connect — OTP bypassed',
          userPhone: e164Number,
          routingNumber,
        },
      });

      return NextResponse.json({
        success: true,
        connected: true,
        skippedOtp: true,
        phoneNumber: e164Number,
        routingNumber,
        message: 'WhatsApp connected (OTP verification bypassed for testing).',
      });
    }

    const verifyStatus = await sendVerificationCode(e164Number);

    // Keep the user's number here until OTP succeeds — verify route checks this field
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        whatsappPhoneNumber: e164Number,
        whatsappProvider: 'twilio',
        whatsappSetupComplete: false,
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
