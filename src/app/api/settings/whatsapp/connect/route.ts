import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { logAuditAction } from '@/lib/auditLogger';
import { sendVerificationCode, normaliseToE164 } from '@/lib/twilio';

/**
 * POST /api/settings/whatsapp/connect
 *
 * Twilio Self-Service WhatsApp Connection Flow:
 * - Accepts { phoneNumber } from the settings UI
 * - Sends an OTP via Twilio Verify to validate ownership
 * - Marks the tenant as pending verification
 * 
 * The actual verification (OTP check) happens at /api/settings/whatsapp/verify
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

    // Normalise to E.164 format
    const e164Number = normaliseToE164(phoneNumber);

    // Send OTP verification code via Twilio Verify
    const verifyStatus = await sendVerificationCode(e164Number);

    // Store the phone number on the tenant (not yet fully connected)
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        whatsappPhoneNumber: e164Number,
        whatsappProvider: 'twilio',
        // Don't set whatsappSetupComplete yet — wait for OTP verification
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
