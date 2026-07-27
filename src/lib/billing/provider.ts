/**
 * Billing provider interface + factory.
 * BILLING_PROVIDER=manual|stitch|ozow
 * Default: Stitch (primary rail) when STITCH_* set, else Ozow, else manual.
 * startCheckout falls back to Ozow when a Stitch checkout fails.
 */

import type { TenantPlan } from '@/lib/plans';
import { manualProvider } from '@/lib/billing/providers/manual';
import { stitchProvider } from '@/lib/billing/providers/stitch';
import { ozowProvider } from '@/lib/billing/providers/ozow';

export type CheckoutResult = {
  checkoutUrl?: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  providerPlanId?: string;
};

export type BillingProvider = {
  id: 'manual' | 'stitch' | 'ozow';
  createCheckout?: (args: {
    tenantId: string;
    plan: TenantPlan;
  }) => Promise<CheckoutResult>;
  changePlan?: (args: {
    tenantId: string;
    plan: TenantPlan;
  }) => Promise<CheckoutResult>;
  cancel?: (args: {
    tenantId: string;
    providerSubscriptionId?: string | null;
    immediately?: boolean;
  }) => Promise<void>;
};

export function ozowCheckoutAvailable(): boolean {
  return Boolean(
    process.env.OZOW_SITE_CODE &&
      process.env.OZOW_PRIVATE_KEY &&
      process.env.OZOW_API_KEY
  );
}

export function getBillingProvider(): BillingProvider {
  const configured = (process.env.BILLING_PROVIDER || '').toLowerCase();

  if (configured === 'stitch') return stitchProvider;
  if (configured === 'ozow') return ozowProvider;
  if (configured === 'manual') return manualProvider;

  // Auto: Stitch is the primary rail; Ozow is the fallback (startCheckout
  // retries failed Stitch checkouts on Ozow when it is configured).
  if (process.env.STITCH_CLIENT_ID && process.env.STITCH_CLIENT_SECRET) {
    return stitchProvider;
  }
  if (ozowCheckoutAvailable()) {
    return ozowProvider;
  }
  return manualProvider;
}
