/**
 * Ozow adapter — hosted Pay-by-Bank checkout for plan upgrades / renewals.
 * Full Capitec VRP recurring requires Ozow sales enablement; this adapter
 * collects the first period payment and activates the subscription via webhook.
 *
 * Env:
 *   OZOW_SITE_CODE (merchant / site code)
 *   OZOW_PRIVATE_KEY
 *   OZOW_API_KEY
 *   OZOW_IS_TEST=true|false
 */

import { createHash } from 'crypto';
import type { BillingProvider, CheckoutResult } from '@/lib/billing/provider';
import { getPlanDefinition, type TenantPlan } from '@/lib/plans';
import { prisma } from '@/lib/prisma';

function requireOzowEnv() {
  const siteCode = process.env.OZOW_SITE_CODE || '';
  const privateKey = process.env.OZOW_PRIVATE_KEY || '';
  const apiKey = process.env.OZOW_API_KEY || '';
  if (!siteCode || !privateKey || !apiKey) {
    throw new Error('Ozow credentials missing (OZOW_SITE_CODE / OZOW_PRIVATE_KEY / OZOW_API_KEY)');
  }
  return { siteCode, privateKey, apiKey };
}

/**
 * Ozow request hash:
 * 1) concatenate posted fields (excluding HashCheck) in docs order
 * 2) append private key
 * 3) lowercase the whole string
 * 4) SHA512 hex
 */
export function buildOzowHash(fields: string[], privateKey: string): string {
  const raw = `${fields.join('')}${privateKey}`.toLowerCase();
  return createHash('sha512').update(raw, 'utf8').digest('hex');
}

/**
 * Ozow return URLs.
 * CancelUrl max = 50 chars → use /pay/c
 * ErrorUrl/SuccessUrl max = 150 → can include query params
 */
export function ozowReturnUrl(
  kind: 'c' | 'e' | 's',
  extras: Record<string, string> = {}
): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  if (kind === 'c') {
    return `${appUrl}/pay/c`;
  }
  // Signup extras (plan/pending) go on the longer return endpoint.
  if (Object.keys(extras).length > 0) {
    const params = new URLSearchParams({ r: kind, ...extras });
    return `${appUrl}/api/billing/ozow/return?${params.toString()}`;
  }
  return `${appUrl}/pay/${kind}`;
}

export const ozowProvider: BillingProvider = {
  id: 'ozow',

  async createCheckout({ tenantId, plan }): Promise<CheckoutResult> {
    const { siteCode, privateKey } = requireOzowEnv();
    const def = getPlanDefinition(plan);
    if (def.priceZarCents == null) {
      throw new Error('Enterprise requires a custom Ozow quote — contact sales');
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, email: true, slug: true },
    });
    if (!tenant) throw new Error('Tenant not found');

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
    const amount = (def.priceZarCents / 100).toFixed(2);
    // Keep under Ozow TransactionReference max (50)
    const transactionReference = `PX-${tenant.slug.slice(0, 12)}-${plan.slice(0, 4)}-${Date.now()}`
      .replace(/[^a-zA-Z0-9\-]/g, '')
      .slice(0, 50);
    const bankReference = `Praxis ${def.name}`.slice(0, 20);
    const isTest = (process.env.OZOW_IS_TEST || 'false').toLowerCase() === 'true';
    const countryCode = 'ZA';
    const currencyCode = 'ZAR';

    const cancelUrl = ozowReturnUrl('c');
    const errorUrl = ozowReturnUrl('e');
    const successUrl = ozowReturnUrl('s');
    const notifyUrl = `${appUrl}/api/billing/ozow/webhook`;

    if (cancelUrl.length > 50) {
      throw new Error(
        `Ozow CancelUrl exceeds 50 chars (${cancelUrl.length}). Set a shorter NEXT_PUBLIC_APP_URL host.`
      );
    }

    // Only hash fields that we actually POST (no empty Optional* placeholders).
    const hash = buildOzowHash(
      [
        siteCode,
        countryCode,
        currencyCode,
        amount,
        transactionReference,
        bankReference,
        cancelUrl,
        errorUrl,
        successUrl,
        notifyUrl,
        isTest ? 'true' : 'false',
      ],
      privateKey
    );

    // Relative so local/preview always hits this deployment's redirect form,
    // not production NEXT_PUBLIC_APP_URL. Cancel/Error/Success/Notify stay
    // absolute (merchant-registered host) for Ozow validation.
    const checkoutUrl = `/api/billing/ozow/redirect?ref=${encodeURIComponent(transactionReference)}&plan=${plan}&tenantId=${tenantId}`;

    // Persist pending checkout details on the subscription row via provider fields
    const payload = {
      siteCode,
      countryCode,
      currencyCode,
      amount,
      transactionReference,
      bankReference,
      cancelUrl,
      errorUrl,
      successUrl,
      notifyUrl,
      isTest: isTest ? 'true' : 'false',
      hashCheck: hash,
    };

    await prisma.subscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        plan,
        status: 'incomplete',
        provider: 'ozow',
        providerSubscriptionId: transactionReference,
        providerPlanId: plan,
        providerCustomerId: JSON.stringify(payload),
      },
      update: {
        plan,
        // Keep past_due/active during checkout; startCheckout already handles status.
        provider: 'ozow',
        providerSubscriptionId: transactionReference,
        providerPlanId: plan,
        providerCustomerId: JSON.stringify(payload),
      },
    });

    return {
      checkoutUrl,
      providerSubscriptionId: transactionReference,
      providerPlanId: plan,
    };
  },
};
