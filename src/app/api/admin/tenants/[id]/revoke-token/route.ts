import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  isPlatformAdminResponse,
  requirePlatformAdmin,
} from '@/lib/platform-admin';
import { AdminLogger } from '@/lib/admin-logs';
import { logAdminAction } from '@/lib/admin-audit';
import { pushTenantLog } from '@/lib/redis';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePlatformAdmin();
  if (isPlatformAdminResponse(admin)) return admin;

  try {
    const { id } = await params;

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        whatsappSetupComplete: false,
        whatsappVerifiedName: null,
        whatsappPhoneNumber: null,
        whatsappProvider: 'twilio',
      }
    });

    await logAdminAction(
      'DISCONNECT_WHATSAPP',
      id,
      { tenantName: tenant.name, tenantSlug: tenant.slug }
    );

    await pushTenantLog(
      id,
      `Twilio WhatsApp connection revoked`,
      'system'
    );

    AdminLogger.log(
      'system',
      `Forced WhatsApp disconnect for Tenant "${tenant.name}" (${tenant.slug})`,
      { tenantId: id }
    );

    return NextResponse.json({ success: true, data: tenant });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to revoke WhatsApp connection';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
