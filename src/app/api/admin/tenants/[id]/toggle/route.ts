import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  isPlatformAdminResponse,
  requirePlatformAdmin,
} from '@/lib/platform-admin';
import { logAdminAction } from '@/lib/admin-audit';
import { AdminLogger } from '@/lib/admin-logs';
import { pushTenantLog } from '@/lib/redis';

/**
 * PUT /api/admin/tenants/[id]/toggle
 * Suspend / activate a tenant. Bumps all user sessionVersions so JWTs die.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePlatformAdmin();
  if (isPlatformAdminResponse(admin)) return admin;

  try {
    const { id } = await params;
    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 });
    }

    const existing = await prisma.tenant.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Protect master control-plane tenants from suspension
    if (!isActive && ['praxisone', 'mlk-computer-consulting'].includes(existing.slug)) {
      return NextResponse.json(
        { error: 'Cannot suspend a platform master tenant' },
        { status: 403 }
      );
    }

    const tenant = await prisma.$transaction(async (tx) => {
      const updated = await tx.tenant.update({
        where: { id },
        data: { isActive },
      });
      // Invalidate all sessions for this tenant when suspending (or clearing on activate is fine too)
      await tx.user.updateMany({
        where: { tenantId: id },
        data: { sessionVersion: { increment: 1 } },
      });
      return updated;
    });

    await logAdminAction(
      isActive ? 'ACTIVATE_TENANT' : 'SUSPEND_TENANT',
      id,
      { tenantName: tenant.name, tenantSlug: tenant.slug }
    );

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
