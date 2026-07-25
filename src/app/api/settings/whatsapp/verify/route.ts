import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { logAuditAction } from '@/lib/auditLogger';
import { checkVerificationCode } from '@/lib/twilio';

/**
 * POST /api/settings/whatsapp/verify
 *
 * Verifies the OTP code submitted by the tenant and completes WhatsApp setup.
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
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
    }

    // Get the tenant's pending phone number
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { whatsappPhoneNumber: true },
    });

    if (!tenant?.whatsappPhoneNumber) {
      return NextResponse.json(
        { error: 'No phone number found. Please start the connection process again.' },
        { status: 400 }
      );
    }

    // Verify the OTP with Twilio
    const result = await checkVerificationCode(tenant.whatsappPhoneNumber, code);

    if (!result.valid) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code. Please try again.' },
        { status: 400 }
      );
    }

    // OTP verified — mark WhatsApp setup as complete
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        whatsappSetupComplete: true,
        whatsappVerifiedName: tenant.whatsappPhoneNumber, // Use the phone number as display name
        whatsappProvider: 'twilio',
      },
    });

    await logAuditAction({
      tenantId,
      userId: (session.user as { id: string }).id,
      action: 'UPDATE',
      entityType: 'Tenant',
      entityId: tenantId,
      details: {
        action: 'WhatsApp Twilio Connect — Verified',
        phoneNumber: tenant.whatsappPhoneNumber,
      },
    });

    return NextResponse.json({
      success: true,
      phoneNumber: tenant.whatsappPhoneNumber,
      message: 'WhatsApp number verified and connected successfully!',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Verification failed';
    console.error('WhatsApp Twilio verify error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
