import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  isPlatformAdminResponse,
  isPlatformAdminSlug,
  requirePlatformAdmin,
} from '@/lib/platform-admin';
import { logAdminAction } from '@/lib/admin-audit';
import { AdminLogger } from '@/lib/admin-logs';

const ALLOWED_ROLES = [
  'administrator',
  'operations_manager',
  'consultant',
] as const;

/**
 * PUT /api/admin/tenants/[tenantId]/users/[userId]
 * Platform ops: disable/enable, change role, force logout (session bump).
 * Never exposes passwords or tenant document content.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const admin = await requirePlatformAdmin();
  if (isPlatformAdminResponse(admin)) return admin;

  try {
    const { id: tenantId, userId } = await params;
    const body = await request.json();
    const { isActive, role, forceLogout } = body as {
      isActive?: boolean;
      role?: string;
      forceLogout?: boolean;
    };

    const target = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: { tenant: { select: { slug: true, name: true } } },
    });

    if (!target) {
      return NextResponse.json({ error: 'User not found in tenant' }, { status: 404 });
    }

    // Never disable or demote another platform admin on a master tenant
    if (
      isPlatformAdminSlug(target.tenant?.slug) &&
      target.role === 'administrator' &&
      target.id !== admin.id
    ) {
      return NextResponse.json(
        { error: 'Cannot modify another platform administrator' },
        { status: 403 }
      );
    }

    const data: {
      isActive?: boolean;
      role?: string;
      sessionVersion?: { increment: number };
    } = {};

    const actions: string[] = [];

    if (typeof isActive === 'boolean' && isActive !== target.isActive) {
      data.isActive = isActive;
      data.sessionVersion = { increment: 1 };
      actions.push(isActive ? 'ENABLE_USER' : 'DISABLE_USER');
    }

    if (typeof role === 'string' && role !== target.role) {
      if (!(ALLOWED_ROLES as readonly string[]).includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      data.role = role;
      data.sessionVersion = { increment: 1 };
      actions.push('UPDATE_USER_ROLE');
    }

    if (forceLogout === true) {
      data.sessionVersion = { increment: 1 };
      actions.push('FORCE_LOGOUT');
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No changes requested' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        sessionVersion: true,
        createdAt: true,
      },
    });

    for (const action of actions) {
      await logAdminAction(action as 'DISABLE_USER' | 'ENABLE_USER' | 'UPDATE_USER_ROLE' | 'FORCE_LOGOUT', userId, {
        tenantId,
        tenantSlug: target.tenant?.slug,
        email: target.email,
        previousRole: target.role,
        newRole: updated.role,
        isActive: updated.isActive,
      });
    }

    AdminLogger.log('system', `User ${target.email} updated by platform admin`, {
      userId,
      tenantId,
      actions,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update user';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
