/**
 * Provider-agnostic billing service.
 * Adapters (manual / stitch / ozow) plug in without changing entitlement guards.
 */

import { prisma } from '@/lib/prisma';
import { logAdminAction } from '@/lib/admin-audit';
import {
  createTrialSubscriptionData,
  type SubscriptionStatus,
} from '@/lib/entitlements';
import {
  getPlanDefinition,
  GRACE_PERIOD_DAYS,
  isTenantPlan,
  type TenantPlan,
} from '@/lib/plans';
import { getBillingProvider, ozowCheckoutAvailable } from '@/lib/billing/provider';
import { addOneMonth } from '@/lib/billing/dates';
import { ozowProvider } from '@/lib/billing/providers/ozow';

export { addOneMonth } from '@/lib/billing/dates';

async function ensureSubscription(tenantId: string, plan: TenantPlan) {
  const existing = await prisma.subscription.findUnique({ where: { tenantId } });
  if (existing) return existing;

  const trial = createTrialSubscriptionData(plan);
  return prisma.subscription.create({
    data: { tenantId, ...trial },
  });
}

export async function startTrial(tenantId: string, plan: TenantPlan = 'starter') {
  if (!isTenantPlan(plan)) throw new Error('Invalid plan');
  const trial = createTrialSubscriptionData(plan);

  await prisma.$transaction([
    prisma.tenant.update({ where: { id: tenantId }, data: { plan } }),
    prisma.subscription.upsert({
      where: { tenantId },
      create: { tenantId, ...trial },
      update: { ...trial, cancelAtPeriodEnd: false, canceledAt: null },
    }),
  ]);

  await logAdminAction('START_TRIAL', tenantId, { plan, trialEndsAt: trial.trialEndsAt });
  return resolveBillingSnapshot(tenantId);
}

export async function changePlan(tenantId: string, plan: TenantPlan) {
  if (!isTenantPlan(plan)) throw new Error('Invalid plan');
  await ensureSubscription(tenantId, plan);

  const provider = getBillingProvider();
  const providerResult = await provider.changePlan?.({ tenantId, plan });

  await prisma.$transaction([
    prisma.tenant.update({ where: { id: tenantId }, data: { plan } }),
    prisma.subscription.update({
      where: { tenantId },
      data: {
        plan,
        provider: provider.id,
        providerPlanId: providerResult?.providerPlanId ?? null,
        providerSubscriptionId:
          providerResult?.providerSubscriptionId ?? undefined,
      },
    }),
  ]);

  await logAdminAction('UPDATE_TENANT_PLAN', tenantId, {
    plan,
    provider: provider.id,
  });
  return resolveBillingSnapshot(tenantId);
}

export async function activateSubscription(
  tenantId: string,
  opts: {
    plan?: TenantPlan;
    providerCustomerId?: string;
    providerSubscriptionId?: string;
    providerPlanId?: string;
    periodEnd?: Date | null;
  } = {}
) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });
  if (!tenant) throw new Error('Tenant not found');

  const plan =
    opts.plan && isTenantPlan(opts.plan)
      ? opts.plan
      : isTenantPlan(tenant.plan)
        ? tenant.plan
        : 'starter';

  // Month-to-month: the paid period starts on successful payment and runs one month.
  const now = new Date();
  const periodEnd = opts.periodEnd ?? addOneMonth(now);

  await prisma.$transaction([
    prisma.tenant.update({ where: { id: tenantId }, data: { plan } }),
    prisma.subscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        plan,
        status: 'active',
        trialStartsAt: null,
        trialEndsAt: null,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        provider: getBillingProvider().id,
        providerCustomerId: opts.providerCustomerId,
        providerSubscriptionId: opts.providerSubscriptionId,
        providerPlanId: opts.providerPlanId,
      },
      update: {
        plan,
        status: 'active',
        trialEndsAt: null,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        canceledAt: null,
        provider: getBillingProvider().id,
        ...(opts.providerCustomerId
          ? { providerCustomerId: opts.providerCustomerId }
          : {}),
        ...(opts.providerSubscriptionId
          ? { providerSubscriptionId: opts.providerSubscriptionId }
          : {}),
        ...(opts.providerPlanId ? { providerPlanId: opts.providerPlanId } : {}),
      },
    }),
  ]);

  await logAdminAction('ACTIVATE_SUBSCRIPTION', tenantId, { plan });
  return resolveBillingSnapshot(tenantId);
}

export async function markPastDue(tenantId: string) {
  await ensureSubscription(
    tenantId,
    (await prisma.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } }))
      ?.plan as TenantPlan || 'starter'
  );

  await prisma.subscription.update({
    where: { tenantId },
    data: { status: 'past_due' },
  });

  await logAdminAction('MARK_PAST_DUE', tenantId, {});
  return resolveBillingSnapshot(tenantId);
}

export async function cancelSubscription(
  tenantId: string,
  opts: { immediately?: boolean } = {}
) {
  const sub = await prisma.subscription.findUnique({ where: { tenantId } });
  if (!sub) throw new Error('No subscription');

  const provider = getBillingProvider();
  await provider.cancel?.({
    tenantId,
    providerSubscriptionId: sub.providerSubscriptionId,
    immediately: opts.immediately,
  });

  if (opts.immediately) {
    await prisma.subscription.update({
      where: { tenantId },
      data: {
        status: 'canceled',
        cancelAtPeriodEnd: false,
        canceledAt: new Date(),
      },
    });
  } else {
    await prisma.subscription.update({
      where: { tenantId },
      data: {
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
      },
    });
  }

  await logAdminAction('CANCEL_SUBSCRIPTION', tenantId, {
    immediately: !!opts.immediately,
  });
  return resolveBillingSnapshot(tenantId);
}

export async function setLimitsOverride(
  tenantId: string,
  override: Record<string, unknown>
) {
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { limitsOverride: JSON.stringify(override) },
  });
  await logAdminAction('UPDATE_LIMITS_OVERRIDE', tenantId, { override });
}

export async function expireTrialsDue(now = new Date()) {
  const due = await prisma.subscription.findMany({
    where: {
      status: 'trialing',
      trialEndsAt: { lte: now },
    },
    select: { tenantId: true, plan: true },
  });

  for (const row of due) {
    // After trial with no payment → past_due (read-only) until they pay
    await prisma.subscription.update({
      where: { tenantId: row.tenantId },
      data: { status: 'past_due' },
    });
  }

  return { expired: due.length };
}

/**
 * Month-to-month paid plans: if a period ended and no renewal payment arrived
 * within the 7-day grace window, the subscription lapses to past_due (read-only).
 */
export async function markLapsedSubscriptions(now = new Date()) {
  const graceCutoff = new Date(
    now.getTime() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
  );

  const lapsed = await prisma.subscription.findMany({
    where: {
      status: 'active',
      currentPeriodEnd: { lte: graceCutoff },
    },
    select: { tenantId: true, plan: true, currentPeriodEnd: true },
  });

  for (const row of lapsed) {
    await prisma.subscription.update({
      where: { tenantId: row.tenantId },
      data: { status: 'past_due' },
    });
    await logAdminAction('MARK_PAST_DUE', row.tenantId, {
      reason: 'grace_period_elapsed',
      periodEnd: row.currentPeriodEnd,
      graceDays: GRACE_PERIOD_DAYS,
    });
  }

  return { lapsed: lapsed.length };
}

export async function resolveBillingSnapshot(tenantId: string) {
  const [tenant, subscription] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, plan: true, limitsOverride: true },
    }),
    prisma.subscription.findUnique({ where: { tenantId } }),
  ]);

  if (!tenant) throw new Error('Tenant not found');
  const plan = isTenantPlan(tenant.plan) ? tenant.plan : 'starter';
  const def = getPlanDefinition(plan);

  return {
    tenantId,
    plan,
    planName: def.name,
    priceZarCents: def.priceZarCents,
    status: (subscription?.status as SubscriptionStatus) || 'active',
    trialEndsAt: subscription?.trialEndsAt ?? null,
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    provider: subscription?.provider ?? 'manual',
    providerCustomerId: subscription?.providerCustomerId ?? null,
    providerSubscriptionId: subscription?.providerSubscriptionId ?? null,
    limitsOverride: tenant.limitsOverride,
  };
}

/**
 * Start checkout for a paid plan. Returns a redirect URL when the provider needs one.
 *
 * Does NOT flip past_due/canceled/active to incomplete — that would either unlock
 * writes (past_due→incomplete was historically mis-handled) or lock upgrades mid-checkout.
 * Status only changes on activate / past_due / cancel finalizers.
 */
export async function startCheckout(tenantId: string, plan: TenantPlan) {
  if (!isTenantPlan(plan)) throw new Error('Invalid plan');
  const provider = getBillingProvider();
  if (!provider.createCheckout) {
    // Manual mode: activate immediately (admin/ops path)
    return activateSubscription(tenantId, { plan });
  }

  const existing = await prisma.subscription.findUnique({ where: { tenantId } });

  let activeProvider = provider;
  const createCheckout = activeProvider.createCheckout;
  if (!createCheckout) {
    return activateSubscription(tenantId, { plan });
  }

  let result;
  try {
    result = await createCheckout({ tenantId, plan });
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    // Stitch credentials can go stale (secret regenerates when viewed);
    // fall back to Ozow when available.
    const stitchAuthFailed =
      activeProvider.id === 'stitch' &&
      (/invalid_client/i.test(message) ||
        /Stitch Express auth failed/i.test(message) ||
        /Stitch credentials/i.test(message));
    if (stitchAuthFailed && ozowCheckoutAvailable() && ozowProvider.createCheckout) {
      console.warn(
        '[billing] Stitch auth failed; falling back to Ozow checkout for this request'
      );
      activeProvider = ozowProvider;
      result = await ozowProvider.createCheckout({ tenantId, plan });
    } else {
      throw err;
    }
  }

  const preserveStatus =
    existing?.status === 'past_due' ||
    existing?.status === 'canceled' ||
    existing?.status === 'active' ||
    existing?.status === 'trialing';

  await prisma.subscription.upsert({
    where: { tenantId },
    create: {
      tenantId,
      plan,
      status: 'incomplete',
      provider: activeProvider.id,
      providerCustomerId: result.providerCustomerId,
      providerSubscriptionId: result.providerSubscriptionId,
      providerPlanId: result.providerPlanId,
    },
    update: {
      plan,
      ...(preserveStatus ? {} : { status: 'incomplete' }),
      provider: activeProvider.id,
      providerCustomerId: result.providerCustomerId,
      providerSubscriptionId: result.providerSubscriptionId,
      providerPlanId: result.providerPlanId,
    },
  });
  await prisma.tenant.update({ where: { id: tenantId }, data: { plan } });

  return {
    checkoutUrl: result.checkoutUrl,
    provider: activeProvider.id,
  };
}

/**
 * Finalize subscriptions that requested cancel-at-period-end once the period ends.
 */
export async function finalizeCanceledSubscriptions(now = new Date()) {
  const due = await prisma.subscription.findMany({
    where: {
      cancelAtPeriodEnd: true,
      status: { in: ['active', 'trialing'] },
      currentPeriodEnd: { lte: now },
    },
    select: { tenantId: true, plan: true, currentPeriodEnd: true },
  });

  for (const row of due) {
    await prisma.subscription.update({
      where: { tenantId: row.tenantId },
      data: {
        status: 'canceled',
        cancelAtPeriodEnd: false,
        canceledAt: new Date(),
      },
    });
    await logAdminAction('CANCEL_SUBSCRIPTION', row.tenantId, {
      reason: 'period_end',
      periodEnd: row.currentPeriodEnd,
    });
  }

  return { canceled: due.length };
}
