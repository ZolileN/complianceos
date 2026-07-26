/**
 * Stitch Money adapter (test/live via client credentials).
 * Uses Subscription Plans + Collections GraphQL API.
 * Docs: https://docs.stitch.money/payment-products/payins/subscriptions/plans
 *
 * Env:
 *   STITCH_CLIENT_ID
 *   STITCH_CLIENT_SECRET
 *   STITCH_API_URL (default https://api.stitch.money/graphql)
 *   STITCH_REDIRECT_URI (must be whitelisted in Stitch dashboard)
 *   STITCH_PLAN_STARTER / STITCH_PLAN_GROWTH / STITCH_PLAN_PROFESSIONAL (optional provider plan IDs)
 */

import type { BillingProvider, CheckoutResult } from '@/lib/billing/provider';
import { getPlanDefinition, type TenantPlan } from '@/lib/plans';
import { prisma } from '@/lib/prisma';

const STITCH_API = () =>
  process.env.STITCH_API_URL || 'https://api.stitch.money/graphql';

async function getClientToken(scopes: string[]): Promise<string> {
  const clientId = process.env.STITCH_CLIENT_ID || '';
  const clientSecret = process.env.STITCH_CLIENT_SECRET || '';
  if (!clientId || !clientSecret) {
    throw new Error('Stitch credentials missing (STITCH_CLIENT_ID / STITCH_CLIENT_SECRET)');
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    audience: 'https://secure.stitch.money/connect/token',
    scope: scopes.join(' '),
  });

  const audience =
    process.env.STITCH_TOKEN_URL || 'https://secure.stitch.money/connect/token';

  const res = await fetch(audience, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 400 && /invalid_client/i.test(text)) {
      throw new Error(
        'Stitch credentials are invalid (invalid_client). Update STITCH_CLIENT_ID / STITCH_CLIENT_SECRET in the Stitch dashboard, or set BILLING_PROVIDER=ozow to use Ozow checkout instead.'
      );
    }
    throw new Error(`Stitch token error (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error('Stitch token response missing access_token');
  return data.access_token;
}

async function stitchGraphql<T>(
  query: string,
  variables: Record<string, unknown>,
  scopes: string[]
): Promise<T> {
  const token = await getClientToken(scopes);
  const res = await fetch(STITCH_API(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = (await res.json()) as {
    data?: T;
    errors?: Array<{ message: string }>;
  };

  if (!res.ok || json.errors?.length) {
    throw new Error(
      `Stitch GraphQL error: ${json.errors?.map((e) => e.message).join('; ') || res.statusText}`
    );
  }
  if (!json.data) throw new Error('Stitch GraphQL returned no data');
  return json.data;
}

function providerPlanEnvKey(plan: TenantPlan): string {
  return `STITCH_PLAN_${plan.toUpperCase()}`;
}

async function ensureStitchPlanId(plan: TenantPlan): Promise<string> {
  const fromEnv = process.env[providerPlanEnvKey(plan)];
  if (fromEnv) return fromEnv;

  // Create a fixed monthly subscription plan on Stitch if not preconfigured
  const def = getPlanDefinition(plan);
  if (def.priceZarCents == null) {
    throw new Error(`Plan ${plan} requires custom pricing — contact sales`);
  }

  const mutation = `
    mutation CreatePlan($input: SubscriptionPlanCreateInput!) {
      subscriptionPlanCreate(input: $input) {
        subscriptionPlan { id }
      }
    }
  `;

  try {
    const data = await stitchGraphql<{
      subscriptionPlanCreate: { subscriptionPlan: { id: string } };
    }>(
      mutation,
      {
        input: {
          planReference: `praxisone-${plan}`,
          name: `PraxisOne ${def.name}`,
          amount: {
            quantity: def.priceZarCents / 100,
            currency: 'ZAR',
          },
          billingModel: 'fixed',
          frequency: 'monthly',
        },
      },
      ['subscription:plan']
    );
    return data.subscriptionPlanCreate.subscriptionPlan.id;
  } catch (err) {
    // Surface a clear setup hint — plan IDs can be set manually in env after dashboard create
    throw new Error(
      `Unable to create/resolve Stitch plan for ${plan}. Set ${providerPlanEnvKey(plan)} or enable subscription:plan scope. ${
        err instanceof Error ? err.message : ''
      }`
    );
  }
}

export const stitchProvider: BillingProvider = {
  id: 'stitch',

  async createCheckout({ tenantId, plan }): Promise<CheckoutResult> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, email: true, slug: true },
    });
    if (!tenant) throw new Error('Tenant not found');

    const planId = await ensureStitchPlanId(plan);
    const redirectUri =
      process.env.STITCH_REDIRECT_URI ||
      `${(process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')}/api/billing/stitch/callback`;

    const mutation = `
      mutation CreateCollection($input: SubscriptionCollectionCreateInput!) {
        subscriptionCollectionCreate(input: $input) {
          subscriptionCollection {
            id
            url
          }
        }
      }
    `;

    const data = await stitchGraphql<{
      subscriptionCollectionCreate: {
        subscriptionCollection: { id: string; url: string };
      };
    }>(
      mutation,
      {
        input: {
          nonce: `praxis-${tenantId}-${plan}-${Date.now()}`,
          subscriptionPlans: [{ id: planId }],
          payer: {
            name: tenant.name,
            email: tenant.email || undefined,
            reference: tenant.slug,
          },
        },
      },
      ['subscription:collection']
    );

    const collection = data.subscriptionCollectionCreate.subscriptionCollection;
    const sep = collection.url.includes('?') ? '&' : '?';
    const checkoutUrl = `${collection.url}${sep}redirect_uri=${encodeURIComponent(redirectUri)}`;

    return {
      checkoutUrl,
      providerSubscriptionId: collection.id,
      providerPlanId: planId,
    };
  },

  async cancel({ providerSubscriptionId }) {
    if (!providerSubscriptionId) return;
    // Best-effort cancel — exact mutation name may vary by Stitch product version
    try {
      await stitchGraphql(
        `mutation Cancel($id: ID!) {
          subscriptionCollectionCancel(id: $id) { success }
        }`,
        { id: providerSubscriptionId },
        ['subscription:collection']
      );
    } catch {
      // Manual follow-up via Stitch dashboard if API cancel is unavailable
    }
  },
};
