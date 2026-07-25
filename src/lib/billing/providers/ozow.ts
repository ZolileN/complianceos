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
 * Ozow request hash: concatenate selected fields + private key, SHA512 lowercase hex.
 * Field order per Ozow hosted payment docs.
 */
export function buildOzowHash(fields: string[], privateKey: string): string {
  const raw = fields.join('') + privateKey;
  return createHash('sha512').update(raw, 'utf8').digest('hex');
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
    const transactionReference = `PRAXIS-${tenant.slug}-${plan}-${Date.now()}`;
    const bankReference = `PraxisOne ${def.name}`.slice(0, 20);
    const isTest = (process.env.OZOW_IS_TEST || 'false').toLowerCase() === 'true';
    const countryCode = 'ZA';
    const currencyCode = 'ZAR';

    const cancelUrl = `${appUrl}/dashboard/settings?billing=cancelled`;
    const errorUrl = `${appUrl}/dashboard/settings?billing=error`;
    const successUrl = `${appUrl}/dashboard/settings?billing=success`;
    const notifyUrl = `${appUrl}/api/billing/ozow/webhook`;

    // Hash fields in Ozow-documented order (SiteCode … PrivateKey)
    const hash = buildOzowHash(
      [
        siteCode,
        countryCode,
        currencyCode,
        amount,
        transactionReference,
        bankReference,
        '', // optionalCancelUrl already below — Ozow uses specific concat; keep notify/success in request body
        cancelUrl,
        errorUrl,
        successUrl,
        notifyUrl,
        isTest ? 'true' : 'false',
      ],
      privateKey
    );

    // Return a URL the browser can POST to, or a signed payload for a client form.
    // We expose a server-built redirect through our own start endpoint that renders a form POST.
    const checkoutUrl = `${appUrl}/api/billing/ozow/redirect?ref=${encodeURIComponent(transactionReference)}&plan=${plan}&tenantId=${tenantId}`;

    // Persist pending checkout details on the subscription row via provider fields
    await prisma.subscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        plan,
        status: 'incomplete',
        provider: 'ozow',
        providerSubscriptionId: transactionReference,
        providerPlanId: plan,
      },
      update: {
        plan,
        status: 'incomplete',
        provider: 'ozow',
        providerSubscriptionId: transactionReference,
        providerPlanId: plan,
      },
    });

    // Stash signed request in a short-lived usage/settings channel via providerCustomerId JSON
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

    await prisma.subscription.update({
      where: { tenantId },
      data: {
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
