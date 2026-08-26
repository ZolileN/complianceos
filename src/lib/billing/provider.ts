/**
 * Billing provider interface + factory.
 * BILLING_PROVIDER=manual|paystack|ozow
 *
 * Paystack is the primary checkout rail whenever PAYSTACK_SECRET_KEY is set.
 * Ozow is used only when Paystack is not configured (no secret key).
 */

import type { TenantPlan } from '@/lib/plans';
import { manualProvider } from '@/lib/billing/providers/manual';
import { paystackProvider } from '@/lib/billing/providers/paystack';
import { ozowProvider } from '@/lib/billing/providers/ozow';

export type CheckoutResult = {
  checkoutUrl?: string;
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  providerPlanId?: string;
};

export type BillingProvider = {
  id: 'manual' | 'paystack' | 'ozow';
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

export function paystackCheckoutAvailable(): boolean {
  return Boolean((process.env.PAYSTACK_SECRET_KEY || '').trim());
}

export function getBillingProvider(): BillingProvider {
  const configured = (process.env.BILLING_PROVIDER || '').toLowerCase();

  if (configured === 'manual') return manualProvider;

  // Paystack wins whenever credentials exist — even if BILLING_PROVIDER=ozow
  // (legacy env from before Paystack go-live).
  if (paystackCheckoutAvailable()) {
    return paystackProvider;
  }

  if (configured === 'paystack') {
    return paystackProvider;
  }

  if (configured === 'ozow' || ozowCheckoutAvailable()) {
    return ozowProvider;
  }

  return manualProvider;
}
