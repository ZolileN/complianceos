/**
 * Paystack adapter — hosted checkout via transaction/initialize.
 *
 * Flow: initialize a one-time payment for the billing period, redirect the
 * customer to Paystack Checkout, then activate the subscription when Paystack
 * reports success (browser callback and/or signed webhook).
 *
 * Env:
 *   PAYSTACK_SECRET_KEY
 *   PAYSTACK_API_URL (default https://api.paystack.co)
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type { BillingProvider, CheckoutResult } from '@/lib/billing/provider';
import { getPlanDefinition } from '@/lib/plans';
import { prisma } from '@/lib/prisma';

const PAYSTACK_API = () =>
  (process.env.PAYSTACK_API_URL ?? 'https://api.paystack.co').replace(/\/$/, '');

export function requirePaystackSecretKey(): string {
  const secretKey = (process.env.PAYSTACK_SECRET_KEY || '').trim();
  if (!secretKey) {
    throw new Error('Paystack credentials missing (PAYSTACK_SECRET_KEY)');
  }
  return secretKey;
}

function paystackHeaders(secretKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${secretKey}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Verify a transaction via GET /transaction/verify/:reference.
 * Returns e.g. "success" / "failed", or null when not found.
 */
export async function getPaystackTransactionStatus(
  reference: string
): Promise<string | null> {
  const secretKey = requirePaystackSecretKey();
  const res = await fetch(
    `${PAYSTACK_API()}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: paystackHeaders(secretKey),
      cache: 'no-store',
    }
  );
  if (res.status === 404) return null;
  const json = (await res.json().catch(() => null)) as {
    status?: boolean;
    data?: { status?: string };
  } | null;
  if (!res.ok || !json?.status || !json.data?.status) {
    throw new Error(`Paystack verify failed (HTTP ${res.status})`);
  }
  return json.data.status;
}

/**
 * Webhook signature: HMAC-SHA512(rawBody, secret_key) hex digest in
 * x-paystack-signature (official Paystack scheme).
 */
export function verifyPaystackSignature(
  rawBody: string,
  signature: string,
  secretKey: string
): boolean {
  const expected = createHmac('sha512', secretKey)
    .update(rawBody, 'utf8')
    .digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Initialize a Paystack transaction and return the hosted checkout URL.
 * Shared by upgrade checkout, paid signup, and renewal dunning.
 */
export async function createPaystackPayment(args: {
  amountCents: number;
  email: string;
  payerName?: string;
  merchantReference: string;
  metadata?: Record<string, string>;
}): Promise<{ checkoutUrl: string; reference: string }> {
  const secretKey = requirePaystackSecretKey();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  const callbackUrl = `${appUrl}/api/billing/paystack/callback`;

  const res = await fetch(`${PAYSTACK_API()}/transaction/initialize`, {
    method: 'POST',
    headers: paystackHeaders(secretKey),
    body: JSON.stringify({
      email: args.email,
      amount: args.amountCents,
      reference: args.merchantReference,
      currency: 'ZAR',
      callback_url: callbackUrl,
      metadata: {
        payer_name: args.payerName,
        ...args.metadata,
      },
    }),
    cache: 'no-store',
  });

  const json = (await res.json().catch(() => null)) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string; reference?: string };
  } | null;

  if (!res.ok || !json?.status || !json.data?.authorization_url) {
    throw new Error(
      `Paystack initialize failed (HTTP ${res.status}): ${json?.message ?? JSON.stringify(json)?.slice(0, 200)}`
    );
  }

  return {
    checkoutUrl: json.data.authorization_url,
    reference: json.data.reference || args.merchantReference,
  };
}

export const paystackProvider: BillingProvider = {
  id: 'paystack',

  async createCheckout({ tenantId, plan }): Promise<CheckoutResult> {
    const def = getPlanDefinition(plan);
    if (def.priceZarCents == null) {
      throw new Error('Enterprise requires a custom quote — contact sales');
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, email: true, slug: true },
    });
    if (!tenant) throw new Error('Tenant not found');
    if (!tenant.email) {
      throw new Error('Tenant email is required for Paystack checkout');
    }

    const reference = `PX-${tenant.slug.slice(0, 24)}-${plan.slice(0, 4)}-${Date.now()}`
      .replace(/[^a-zA-Z0-9\-_.]/g, '')
      .slice(0, 64);

    const { checkoutUrl } = await createPaystackPayment({
      amountCents: def.priceZarCents,
      email: tenant.email,
      payerName: tenant.name,
      merchantReference: reference,
      metadata: { tenant_id: tenantId, plan },
    });

    await prisma.subscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        plan,
        status: 'incomplete',
        provider: 'paystack',
        providerSubscriptionId: reference,
        providerPlanId: plan,
      },
      update: {
        plan,
        provider: 'paystack',
        providerSubscriptionId: reference,
        providerPlanId: plan,
      },
    });

    return {
      checkoutUrl,
      providerSubscriptionId: reference,
      providerPlanId: plan,
    };
  },

  async cancel() {
    // One-shot period payments; renewals stop once the local subscription is canceled.
  },
};
