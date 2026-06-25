import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { AdminLogger } from '@/lib/admin-logs';
import { logAdminAction } from '@/lib/admin-audit';
import { pushTenantLog } from '@/lib/redis';

export async function PUT(
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
    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 });
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: { isActive }
    });

    // Central Platform Admin Logging (Postgres)
    await logAdminAction(
      isActive ? 'ACTIVATE_TENANT' : 'SUSPEND_TENANT',
      id,
      { tenantName: tenant.name, tenantSlug: tenant.slug }
    );

    // Isolated Tenant Streaming Log (Redis)
    await pushTenantLog(
      id,
      `Tenant status updated to ${isActive ? 'ACTIVE' : 'SUSPENDED'}`,
      'system',
      { isActive }
    );

    AdminLogger.log(
      'system',
      `Tenant "${tenant.name}" (${tenant.slug}) status updated to ${isActive ? 'ACTIVE' : 'SUSPENDED'}`,
      { tenantId: id, isActive }
    );

    return NextResponse.json({ success: true, data: tenant });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update tenant';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
