/**
 * Entitlements resolver + assertion helpers.
 * Plan catalog is the default; Subscription status + limitsOverride can tighten access.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  DEFAULT_SIGNUP_PLAN,
  getPlanDefinition,
  isTenantPlan,
  type TenantPlan,
} from '@/lib/plans';
import { isPlatformAdminSlug } from '@/lib/platform-admin-constants';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete';

export type LimitsOverride = {
  maxUsers?: number | null;
  maxClients?: number | null;
  aiEnabled?: boolean;
  messagesPerMonthSoft?: number;
};

export type Entitlements = {
  tenantId: string;
  plan: TenantPlan;
  planName: string;
  status: SubscriptionStatus;
  readOnly: boolean;
  aiEnabled: boolean;
  whatsappEnabled: boolean;
  maxUsers: number | null;
  maxClients: number | null;
  messagesPerMonthSoft: number;
  usage: {
    users: number;
    clients: number;
    messagesThisMonth: number;
    documents: number;
  };
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  priceZarCents: number | null;
};

export class PlanLimitError extends Error {
  code = 'PLAN_LIMIT' as const;
  status = 402;
  details: Record<string, unknown>;

  constructor(message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'PlanLimitError';
    this.details = details;
  }
}

export class ReadOnlyError extends Error {
  code = 'SUBSCRIPTION_READ_ONLY' as const;
  status = 403;

  constructor(message = 'Subscription is past due. Account is read-only until payment is received.') {
    super(message);
    this.name = 'ReadOnlyError';
  }
}

function parseJsonObject(raw: string | null | undefined): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || '{}') as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function monthKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function asNullableNumber(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return undefined;
}

export async function resolveEntitlements(tenantId: string): Promise<Entitlements> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      plan: true,
      slug: true,
      settings: true,
      limitsOverride: true,
      subscription: true,
      _count: {
        select: {
          users: true,
          clients: true,
          documents: true,
        },
      },
    },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // Master control-plane tenants (PraxisAdmin) are internal — no subscription,
  // no seat/client limits, never read-only.
  if (isPlatformAdminSlug(tenant.slug)) {
    const settings = parseJsonObject(tenant.settings);
    const plan = isTenantPlan(tenant.plan) ? tenant.plan : DEFAULT_SIGNUP_PLAN;
    return {
      tenantId,
      plan,
      planName: 'Platform (internal)',
      status: 'active',
      readOnly: false,
      aiEnabled: true,
      whatsappEnabled: settings.whatsapp_enabled !== false,
      maxUsers: null,
      maxClients: null,
      messagesPerMonthSoft: Number.MAX_SAFE_INTEGER,
      usage: {
        users: tenant._count.users,
        clients: tenant._count.clients,
        messagesThisMonth: 0,
        documents: tenant._count.documents,
      },
      trialEndsAt: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      priceZarCents: null,
    };
  }

  const plan = isTenantPlan(tenant.plan) ? tenant.plan : DEFAULT_SIGNUP_PLAN;
  const def = getPlanDefinition(plan);
  const override = parseJsonObject(tenant.limitsOverride) as LimitsOverride;
  const settings = parseJsonObject(tenant.settings);

  const status = (tenant.subscription?.status as SubscriptionStatus) || 'active';
  // incomplete = unpaid checkout in progress; past_due/canceled = unpaid/terminated
  const readOnly =
    status === 'past_due' || status === 'canceled' || status === 'incomplete';

  const messagesThisMonth =
    (
      await prisma.usageCounter.findUnique({
        where: {
          tenantId_metric_periodKey: {
            tenantId,
            metric: 'whatsapp_messages',
            periodKey: monthKey(),
          },
        },
        select: { quantity: true },
      })
    )?.quantity ??
    (await prisma.message.count({
      where: {
        tenantId,
        createdAt: {
          gte: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)),
        },
      },
    }));

  const maxUsers =
    asNullableNumber(override.maxUsers) !== undefined
      ? (override.maxUsers as number | null)
      : def.maxUsers;
  const maxClients =
    asNullableNumber(override.maxClients) !== undefined
      ? (override.maxClients as number | null)
      : def.maxClients;
  const aiEnabled =
    typeof override.aiEnabled === 'boolean' ? override.aiEnabled : def.aiEnabled;
  const messagesPerMonthSoft =
    typeof override.messagesPerMonthSoft === 'number'
      ? override.messagesPerMonthSoft
      : def.messagesPerMonthSoft;

  return {
    tenantId,
    plan,
    planName: def.name,
    status,
    readOnly,
    aiEnabled,
    whatsappEnabled: settings.whatsapp_enabled !== false,
    maxUsers,
    maxClients,
    messagesPerMonthSoft,
    usage: {
      users: tenant._count.users,
      clients: tenant._count.clients,
      messagesThisMonth,
      documents: tenant._count.documents,
    },
    trialEndsAt: tenant.subscription?.trialEndsAt?.toISOString() ?? null,
    currentPeriodEnd: tenant.subscription?.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: tenant.subscription?.cancelAtPeriodEnd ?? false,
    priceZarCents: def.priceZarCents,
  };
}

export function planLimitResponse(error: PlanLimitError): NextResponse {
  return NextResponse.json(
    {
      error: error.message,
      code: error.code,
      ...error.details,
    },
    { status: error.status }
  );
}

export function readOnlyResponse(error: ReadOnlyError = new ReadOnlyError()): NextResponse {
  return NextResponse.json(
    { error: error.message, code: error.code },
    { status: error.status }
  );
}

export async function assertWritable(tenantId: string): Promise<Entitlements> {
  const entitlements = await resolveEntitlements(tenantId);
  if (entitlements.readOnly) {
    throw new ReadOnlyError();
  }
  return entitlements;
}

export async function assertSeatAvailable(tenantId: string): Promise<Entitlements> {
  const entitlements = await assertWritable(tenantId);
  if (
    entitlements.maxUsers != null &&
    entitlements.usage.users >= entitlements.maxUsers
  ) {
    throw new PlanLimitError(
      `Seat limit reached for the ${entitlements.planName} plan (${entitlements.maxUsers} users).`,
      {
        plan: entitlements.plan,
        limit: entitlements.maxUsers,
        current: entitlements.usage.users,
        resource: 'users',
      }
    );
  }
  return entitlements;
}

export async function assertClientCapacity(tenantId: string): Promise<Entitlements> {
  const entitlements = await assertWritable(tenantId);
  if (
    entitlements.maxClients != null &&
    entitlements.usage.clients >= entitlements.maxClients
  ) {
    throw new PlanLimitError(
      `Client limit reached for the ${entitlements.planName} plan (${entitlements.maxClients} clients).`,
      {
        plan: entitlements.plan,
        limit: entitlements.maxClients,
        current: entitlements.usage.clients,
        resource: 'clients',
      }
    );
  }
  return entitlements;
}

export async function requireAiFeature(tenantId: string): Promise<Entitlements> {
  const entitlements = await assertWritable(tenantId);
  if (!entitlements.aiEnabled) {
    throw new PlanLimitError(
      `AI features require the Professional or Enterprise plan. Current plan: ${entitlements.planName}.`,
      {
        plan: entitlements.plan,
        feature: 'ai',
        current: false,
        limit: true,
      }
    );
  }
  return entitlements;
}

export async function assertWhatsappEnabled(tenantId: string): Promise<Entitlements> {
  const entitlements = await assertWritable(tenantId);
  if (!entitlements.whatsappEnabled) {
    throw new PlanLimitError('WhatsApp messaging is disabled for this workspace.', {
      plan: entitlements.plan,
      feature: 'whatsapp',
      current: false,
      limit: true,
    });
  }
  return entitlements;
}

export async function incrementUsage(
  tenantId: string,
  metric: string,
  by = 1,
  at = new Date()
): Promise<void> {
  const periodKey = monthKey(at);
  await prisma.usageCounter.upsert({
    where: {
      tenantId_metric_periodKey: { tenantId, metric, periodKey },
    },
    create: { tenantId, metric, periodKey, quantity: by },
    update: { quantity: { increment: by } },
  });
}

export function createTrialSubscriptionData(plan: TenantPlan = DEFAULT_SIGNUP_PLAN) {
  const def = getPlanDefinition(plan);
  const now = new Date();
  const trialDays = def.trialDays > 0 ? def.trialDays : 0;
  const trialEndsAt =
    trialDays > 0
      ? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000)
      : null;

  return {
    plan,
    status: trialDays > 0 ? ('trialing' as const) : ('active' as const),
    trialStartsAt: trialDays > 0 ? now : null,
    trialEndsAt,
    currentPeriodStart: now,
    currentPeriodEnd: trialEndsAt,
    provider: 'manual',
  };
}
