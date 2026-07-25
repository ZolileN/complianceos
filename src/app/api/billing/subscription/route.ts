import { NextRequest, NextResponse } from 'next/server';
import {
  isRbacResponse,
  requireRoles,
  requireTenantSession,
} from '@/lib/rbac';
import {
  cancelSubscription,
  resolveBillingSnapshot,
} from '@/lib/billing/service';
import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/lib/admin-audit';

/**
 * Tenant self-serve subscription controls (administrator only).
 * POST { action: 'cancel' | 'resume_cancel' }
 * - cancel: schedule cancel at period end (immediate cancel is Admin Ops only)
 * - resume_cancel: undo a pending cancel-at-period-end while still active
 */
export async function POST(request: NextRequest) {
  const user = await requireTenantSession();
  if (isRbacResponse(user)) return user;
  const forbidden = requireRoles(user, ['administrator']);
  if (forbidden) return forbidden;

  const tenantId = user.tenantId!;

  try {
    const body = await request.json();
    const action = body.action as string;

    if (action === 'cancel') {
      const data = await cancelSubscription(tenantId, { immediately: false });
      return NextResponse.json({ success: true, data });
    }

    if (action === 'resume_cancel') {
      const sub = await prisma.subscription.findUnique({ where: { tenantId } });
      if (!sub) {
        return NextResponse.json({ error: 'No subscription' }, { status: 404 });
      }
      if (sub.status !== 'active' && sub.status !== 'trialing') {
        return NextResponse.json(
          { error: 'Can only resume cancellation on an active subscription' },
          { status: 400 }
        );
      }
      if (!sub.cancelAtPeriodEnd) {
        const data = await resolveBillingSnapshot(tenantId);
        return NextResponse.json({ success: true, data });
      }

      await prisma.subscription.update({
        where: { tenantId },
        data: { cancelAtPeriodEnd: false, canceledAt: null },
      });
      await logAdminAction('ACTIVATE_SUBSCRIPTION', tenantId, {
        reason: 'resume_cancel',
      });
      const data = await resolveBillingSnapshot(tenantId);
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    );
  }
}
