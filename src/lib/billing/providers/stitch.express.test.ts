import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    tenant: { findUnique: vi.fn() },
    subscription: { upsert: vi.fn() },
  },
}));

import { prisma } from '@/lib/prisma';
import {
  stitchProvider,
  verifyExpressSignature,
} from '@/lib/billing/providers/stitch';
import { createHash, createHmac } from 'crypto';

const prismaMock = prisma as unknown as {
  tenant: { findUnique: ReturnType<typeof vi.fn> };
  subscription: { upsert: ReturnType<typeof vi.fn> };
};

describe('stitchProvider.createCheckout (Stitch Express)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.stubEnv('STITCH_CLIENT_ID', 'test-client');
    vi.stubEnv('STITCH_CLIENT_SECRET', 'secret');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://praxis.mlkcomputer.com');

    prismaMock.tenant.findUnique.mockResolvedValue({
      name: 'Acme Firm',
      email: 'owner@example.com',
      slug: 'acme-firm',
    });
    prismaMock.subscription.upsert.mockResolvedValue({});
  });

  it('creates an Express payment link and stores the reference', async () => {
    const fetchMock = vi
      .fn()
      // token
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { accessToken: 'tok' } }),
      })
      // payment create
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            payment: { link: 'https://express.stitch.money/pay/abc', id: 'pay_1' },
          },
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const result = await stitchProvider.createCheckout!({
      tenantId: 'tenant-1',
      plan: 'growth',
    });

    expect(result.checkoutUrl).toBe(
      'https://express.stitch.money/pay/abc?redirect_url=' +
        encodeURIComponent(
          'https://praxis.mlkcomputer.com/api/billing/stitch/callback'
        )
    );
    expect(result.providerSubscriptionId).toMatch(/^PX-acme-firm-grow-\d+$/);

    // Amount is sent in cents to /api/v1/payments with the bearer token.
    const paymentCall = fetchMock.mock.calls[1];
    expect(paymentCall[0]).toContain('/api/v1/payments');
    const body = JSON.parse(paymentCall[1].body as string) as {
      amount: number;
      currency: string;
      merchantReference: string;
    };
    expect(body.amount).toBe(2_999_00);
    expect(body.currency).toBe('ZAR');
    expect(body.merchantReference).toBe(result.providerSubscriptionId);

    expect(prismaMock.subscription.upsert).toHaveBeenCalledTimes(1);
    const upsertArg = prismaMock.subscription.upsert.mock.calls[0][0] as {
      create: { providerSubscriptionId: string; providerCustomerId: string };
    };
    expect(upsertArg.create.providerSubscriptionId).toBe(
      result.providerSubscriptionId
    );
    expect(upsertArg.create.providerCustomerId).toBe('pay_1');
  });

  it('surfaces auth failures with a dashboard hint', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ success: false }),
      })
    );

    await expect(
      stitchProvider.createCheckout!({ tenantId: 'tenant-1', plan: 'growth' })
    ).rejects.toThrow(/Stitch Express auth failed/);
  });
});

describe('verifyExpressSignature', () => {
  it('accepts the official plugin signature scheme and rejects tampering', () => {
    const secret = 'client-secret';
    const rawBody = JSON.stringify({ payment_id: 'pay_1', reference: 'PX-1' });
    const hashedSecret = createHash('sha256').update(secret).digest('base64');
    const signature = createHmac('sha256', hashedSecret)
      .update(rawBody)
      .digest('hex');

    expect(verifyExpressSignature(rawBody, signature, secret)).toBe(true);
    expect(verifyExpressSignature(rawBody + 'x', signature, secret)).toBe(false);
    expect(verifyExpressSignature(rawBody, signature, 'wrong-secret')).toBe(false);
  });
});
