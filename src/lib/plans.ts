/**
 * Single source of truth for PraxisOne plan catalog.
 * Landing page, admin, FinOps, and entitlements all read from here.
 */

export const TENANT_PLANS = [
  'starter',
  'growth',
  'professional',
  'enterprise',
] as const;

export type TenantPlan = (typeof TENANT_PLANS)[number];

export function isTenantPlan(value: string): value is TenantPlan {
  return (TENANT_PLANS as readonly string[]).includes(value);
}

/** Days after a paid period ends before the account becomes read-only. */
export const GRACE_PERIOD_DAYS = 7;

/** null = unlimited */
export type PlanDefinition = {
  id: TenantPlan;
  name: string;
  /** Monthly price in ZAR cents; null = custom / contact sales */
  priceZarCents: number | null;
  maxUsers: number | null;
  maxClients: number | null;
  aiEnabled: boolean;
  /** Soft WhatsApp message cap per calendar month (warn, do not hard-block) */
  messagesPerMonthSoft: number;
  /** Days of trial when this plan is the signup default; 0 = no trial on this plan */
  trialDays: number;
  marketingBullets: string[];
};

export const PLAN_CATALOG: Record<TenantPlan, PlanDefinition> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    priceZarCents: 999_00,
    maxUsers: 3,
    maxClients: 100,
    aiEnabled: false,
    messagesPerMonthSoft: 1_000,
    trialDays: 14,
    marketingBullets: ['3 users', '100 clients', '14-day free trial'],
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    priceZarCents: 2_999_00,
    maxUsers: 10,
    maxClients: 1_000,
    aiEnabled: false,
    messagesPerMonthSoft: 10_000,
    trialDays: 0,
    marketingBullets: ['10 users', '1,000 clients'],
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    priceZarCents: 7_999_00,
    maxUsers: null,
    maxClients: null,
    aiEnabled: true,
    messagesPerMonthSoft: 50_000,
    trialDays: 0,
    marketingBullets: ['Unlimited users', 'Unlimited clients', 'AI features'],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceZarCents: null,
    maxUsers: null,
    maxClients: null,
    aiEnabled: true,
    messagesPerMonthSoft: 250_000,
    trialDays: 0,
    marketingBullets: [
      'Custom implementation',
      'Dedicated support & SLAs',
      'Bespoke integrations',
    ],
  },
};

export const DEFAULT_SIGNUP_PLAN: TenantPlan = 'starter';

export function getPlanDefinition(plan: string): PlanDefinition {
  if (isTenantPlan(plan)) return PLAN_CATALOG[plan];
  return PLAN_CATALOG.starter;
}

export function formatZarFromCents(cents: number | null): string {
  if (cents == null) return 'Custom';
  return `R${(cents / 100).toLocaleString('en-ZA')}`;
}
