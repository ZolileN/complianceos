import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  isPlatformAdminResponse,
  requirePlatformAdmin,
} from '@/lib/platform-admin';
import { PLATFORM_ADMIN_SLUGS } from '@/lib/platform-admin-constants';
import {
  formatZarFromCents,
  getPlanDefinition,
  GRACE_PERIOD_DAYS,
  isTenantPlan,
} from '@/lib/plans';

export async function GET() {
  const admin = await requirePlatformAdmin();
  if (isPlatformAdminResponse(admin)) return admin;

  try {
    const now = new Date();
    const trialSoonCutoff = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const graceCutoff = new Date(
      now.getTime() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
    );

    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        isActive: true,
        limitsOverride: true,
        subscription: {
          select: {
            plan: true,
            status: true,
            trialStartsAt: true,
            trialEndsAt: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
            canceledAt: true,
            provider: true,
            providerCustomerId: true,
            providerSubscriptionId: true,
            providerPlanId: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const rows = tenants.map((t) => {
      const sub = t.subscription;
      const plan = isTenantPlan(sub?.plan || t.plan)
        ? (sub?.plan || t.plan)
        : 'starter';
      const def = getPlanDefinition(plan);
      const status = (sub?.status as string) || 'active';
      const periodEnd = sub?.currentPeriodEnd ?? null;
      const trialEndsAt = sub?.trialEndsAt ?? null;

      const inGrace =
        status === 'active' &&
        !!periodEnd &&
        periodEnd.getTime() <= now.getTime() &&
        periodEnd.getTime() > graceCutoff.getTime();

      const trialEndingSoon =
        status === 'trialing' &&
        !!trialEndsAt &&
        trialEndsAt.getTime() > now.getTime() &&
        trialEndsAt.getTime() <= trialSoonCutoff.getTime();

      const isPlatformTenant = (PLATFORM_ADMIN_SLUGS as readonly string[]).includes(
        t.slug
      );

      return {
        tenantId: t.id,
        name: t.name,
        slug: t.slug,
        isActive: t.isActive,
        isPlatformTenant,
        plan,
        planName: def.name,
        priceZarCents: def.priceZarCents,
        status,
        inGrace,
        trialEndingSoon,
        trialStartsAt: sub?.trialStartsAt?.toISOString() ?? null,
        trialEndsAt: trialEndsAt?.toISOString() ?? null,
        currentPeriodStart: sub?.currentPeriodStart?.toISOString() ?? null,
        currentPeriodEnd: periodEnd?.toISOString() ?? null,
        cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
        canceledAt: sub?.canceledAt?.toISOString() ?? null,
        provider: sub?.provider ?? 'manual',
        providerCustomerId: sub?.providerCustomerId ?? null,
        providerSubscriptionId: sub?.providerSubscriptionId ?? null,
        providerPlanId: sub?.providerPlanId ?? null,
        hasSubscription: !!sub,
        limitsOverride: t.limitsOverride,
      };
    });

    const billable = rows.filter((r) => !r.isPlatformTenant);

    const counts = {
      trialing: 0,
      active: 0,
      past_due: 0,
      canceled: 0,
      incomplete: 0,
      other: 0,
    };
    for (const r of billable) {
      if (r.status in counts) {
        counts[r.status as keyof typeof counts] += 1;
      } else {
        counts.other += 1;
      }
    }

    const inGraceCount = billable.filter((r) => r.inGrace).length;
    const trialsEndingSoon = billable.filter((r) => r.trialEndingSoon).length;

    const mrrCents = billable
      .filter((r) => r.status === 'active' && !r.inGrace)
      .reduce((sum, r) => sum + (r.priceZarCents ?? 0), 0);

    return NextResponse.json({
      success: true,
      summary: {
        mrrCents,
        mrrFormatted: formatZarFromCents(mrrCents),
        counts,
        inGrace: inGraceCount,
        trialsEndingSoon,
        gracePeriodDays: GRACE_PERIOD_DAYS,
        totalTenants: billable.length,
      },
      rows,
    });
  } catch (error: unknown) {
    console.error('Admin billing list error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve billing data' },
      { status: 500 }
    );
  }
}
