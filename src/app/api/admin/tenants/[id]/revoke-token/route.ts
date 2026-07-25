import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { AdminLogger } from '@/lib/admin-logs';
import { logAdminAction } from '@/lib/admin-audit';
import { pushTenantLog } from '@/lib/redis';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string; tenantSlug?: string } | undefined;
  if (!session || user?.role !== 'administrator' || !['praxisone', 'mlk-computer-consulting'].includes(user?.tenantSlug as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
