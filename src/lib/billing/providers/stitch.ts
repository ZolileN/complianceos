/**
 * Stitch Express adapter — hosted payment links via the Express REST API.
 *
 * NOTE: This targets Stitch Express (express.stitch.money), the product our
 * merchant account is registered on — not the classic Stitch GraphQL platform
 * (secure.stitch.money), whose clients are provisioned separately.
 *
 * Flow: create a payment link for the first billing period, redirect the
 * customer, then activate the subscription when the payment reports PAID
 * (browser callback and/or HMAC-signed webhook).
 *
 * Env:
 *   STITCH_CLIENT_ID
 *   STITCH_CLIENT_SECRET
 *   STITCH_EXPRESS_API_URL (default https://express.stitch.money)
 */

import { createHash, createHmac, timingSafeEqual } from 'crypto';
import type { BillingProvider, CheckoutResult } from '@/lib/billing/provider';
import { getPlanDefinition } from '@/lib/plans';
import { prisma } from '@/lib/prisma';

const EXPRESS_API = () =>
  (process.env.STITCH_EXPRESS_API_URL || 'https://express.stitch.money').replace(
    /\/$/,
    ''
  );

function requireStitchEnv() {
  const clientId = (process.env.STITCH_CLIENT_ID || '').trim();
  const clientSecret = (process.env.STITCH_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      'Stitch credentials missing (STITCH_CLIENT_ID / STITCH_CLIENT_SECRET)'
    );
  }
  return { clientId, clientSecret };
}

export async function getExpressToken(): Promise<string> {
  const { clientId, clientSecret } = requireStitchEnv();
  const res = await fetch(`${EXPRESS_API()}/api/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, clientSecret }),
    cache: 'no-store',
  });
  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    data?: { accessToken?: string };
  } | null;
  if (!res.ok || !json?.success || !json.data?.accessToken) {
    throw new Error(
      `Stitch Express auth failed (HTTP ${res.status}). Check STITCH_CLIENT_ID / STITCH_CLIENT_SECRET in the Stitch Express dashboard (API Details).`
    );
  }
  return json.data.accessToken;
}

/**
 * Payment status via GET /api/v1/payments/{id}. Returns e.g. PAID / CREATED,
 * or null when the payment does not exist.
 */
export async function getExpressPaymentStatus(
  paymentId: string,
  merchantReference?: string
): Promise<string | null> {
  const token = await getExpressToken();
  const qs = merchantReference
    ? `?merchantReference=${encodeURIComponent(merchantReference)}`
    : '';
  const res = await fetch(
    `${EXPRESS_API()}/api/v1/payments/${encodeURIComponent(paymentId)}${qs}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    }
  );
  if (res.status === 404) return null;
  const json = (await res.json().catch(() => null)) as {
    data?: { payment?: { status?: string } };
  } | null;
  if (!res.ok || !json?.data?.payment?.status) {
    throw new Error(`Stitch Express status check failed (HTTP ${res.status})`);
  }
  return json.data.payment.status;
}

/**
 * Webhook signature: HMAC-SHA256(rawBody) keyed with base64(SHA256(client_secret)),
 * sent in the X-Stitch-Express-Signature header (matches the official plugin).
 */
export function verifyExpressSignature(
  rawBody: string,
  signature: string,
  clientSecret: string
): boolean {
  const hashedSecret = createHash('sha256')
    .update(clientSecret, 'utf8')
    .digest('base64');
  const expected = createHmac('sha256', hashedSecret)
    .update(rawBody, 'utf8')
    .digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export const stitchProvider: BillingProvider = {
  id: 'stitch',

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

    const token = await getExpressToken();
    const reference = `PX-${tenant.slug.slice(0, 24)}-${plan.slice(0, 4)}-${Date.now()}`
      .replace(/[^a-zA-Z0-9\-]/g, '')
      .slice(0, 64);

    const res = await fetch(`${EXPRESS_API()}/api/v1/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: def.priceZarCents,
        payerName: tenant.name,
        payerEmailAddress: tenant.email || undefined,
        merchantReference: reference,
        skipCheckoutPage: false,
        currency: 'ZAR',
      }),
      cache: 'no-store',
    });

    const json = (await res.json().catch(() => null)) as {
      success?: boolean;
      data?: { payment?: { link?: string; id?: string } };
    } | null;

    if (!res.ok || !json?.success || !json.data?.payment?.link) {
      throw new Error(
        `Stitch Express payment create failed (HTTP ${res.status}): ${JSON.stringify(json)?.slice(0, 200)}`
      );
    }

    // Express sends the payer back to redirect_url (must be registered in the
    // Express dashboard) with payment_id + reference query params.
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
    const callbackUrl = `${appUrl}/api/billing/stitch/callback`;
    const link = json.data.payment.link;
    const sep = link.includes('?') ? '&' : '?';
    const checkoutUrl = `${link}${sep}redirect_url=${encodeURIComponent(callbackUrl)}`;

    await prisma.subscription.upsert({
      where: { tenantId },
      create: {
        tenantId,
        plan,
        status: 'incomplete',
        provider: 'stitch',
        providerSubscriptionId: reference,
        providerPlanId: plan,
        providerCustomerId: json.data.payment.id || null,
      },
      update: {
        plan,
        provider: 'stitch',
        providerSubscriptionId: reference,
        providerPlanId: plan,
        providerCustomerId: json.data.payment.id || null,
      },
    });

    return {
      checkoutUrl,
      providerSubscriptionId: reference,
      providerPlanId: plan,
    };
  },

  async cancel() {
    // Express payments are single collections; nothing to cancel provider-side.
    // Renewals simply stop being issued once the local subscription is canceled.
  },
};
