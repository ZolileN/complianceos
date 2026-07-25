import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  isPlatformAdminResponse,
  requirePlatformAdmin,
} from '@/lib/platform-admin';
import { isTenantPlan } from '@/lib/plans';
import {
  activateSubscription,
  cancelSubscription,
  changePlan,
  markPastDue,
  setLimitsOverride,
  startTrial,
  resolveBillingSnapshot,
} from '@/lib/billing/service';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePlatformAdmin();
  if (isPlatformAdminResponse(admin)) return admin;

  const { id } = await params;
  try {
    const data = await resolveBillingSnapshot(id);
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 404 }
    );
  }
}

/**
 * PATCH — admin billing controls:
 * { action: 'activate'|'past_due'|'cancel'|'start_trial'|'change_plan'|'override', plan?, immediately?, override? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePlatformAdmin();
  if (isPlatformAdminResponse(admin)) return admin;

  const { id } = await params;
  const body = await req.json();
  const action = body.action as string;

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    if (action === 'activate') {
      const plan = body.plan;
      if (plan && !isTenantPlan(plan)) {
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
      }
      const data = await activateSubscription(id, { plan });
      return NextResponse.json({ success: true, data });
    }

    if (action === 'past_due') {
      const data = await markPastDue(id);
      return NextResponse.json({ success: true, data });
    }

    if (action === 'cancel') {
      const data = await cancelSubscription(id, {
        immediately: !!body.immediately,
      });
      return NextResponse.json({ success: true, data });
    }

    if (action === 'start_trial') {
      const plan = isTenantPlan(body.plan) ? body.plan : 'starter';
      const data = await startTrial(id, plan);
      return NextResponse.json({ success: true, data });
    }

    if (action === 'change_plan') {
      if (!isTenantPlan(body.plan)) {
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
      }
      const data = await changePlan(id, body.plan);
      return NextResponse.json({ success: true, data });
    }

    if (action === 'override') {
      await setLimitsOverride(id, body.override || {});
      const data = await resolveBillingSnapshot(id);
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
