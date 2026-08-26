import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    tenant: { findUnique: vi.fn(), update: vi.fn() },
    subscription: { upsert: vi.fn() },
    user: { findFirst: vi.fn() },
  },
}));

import { prisma } from '@/lib/prisma';
import {
  paystackProvider,
  verifyPaystackSignature,
} from '@/lib/billing/providers/paystack';
import { createHmac } from 'crypto';

const prismaMock = prisma as unknown as {
  tenant: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  subscription: { upsert: ReturnType<typeof vi.fn> };
  user: { findFirst: ReturnType<typeof vi.fn> };
};

describe('paystackProvider.createCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    vi.stubEnv('PAYSTACK_SECRET_KEY', 'sk_test_secret');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://praxis.example.com');

    prismaMock.tenant.findUnique.mockImplementation(
      ({ select }: { select?: { email?: boolean; name?: boolean } }) => {
        if (select?.email !== undefined && select?.name === undefined) {
          return Promise.resolve({ email: 'owner@example.com' });
        }
        return Promise.resolve({ name: 'Acme Firm', slug: 'acme-firm' });
      }
    );
    prismaMock.tenant.update.mockResolvedValue({});
    prismaMock.user.findFirst.mockResolvedValue({
      email: 'admin@example.com',
    });
    prismaMock.subscription.upsert.mockResolvedValue({});
  });

  it('initializes a Paystack transaction and stores the reference', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: true,
        data: {
          authorization_url: 'https://checkout.paystack.com/abc',
          reference: 'PX-acme-firm-grow-1',
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await paystackProvider.createCheckout!({
      tenantId: 'tenant-1',
      plan: 'growth',
    });

    expect(result.checkoutUrl).toBe('https://checkout.paystack.com/abc');
    expect(result.providerSubscriptionId).toMatch(/^PX-acme-firm-grow-\d+$/);

    const initCall = fetchMock.mock.calls[0];
    expect(initCall[0]).toContain('/transaction/initialize');
    const body = JSON.parse(initCall[1].body as string) as {
      amount: number;
      currency: string;
      email: string;
      reference: string;
      callback_url: string;
    };
    expect(body.amount).toBe(2_999_00);
    expect(body.currency).toBe('ZAR');
    expect(body.email).toBe('owner@example.com');
    expect(body.reference).toBe(result.providerSubscriptionId);
    expect(body.callback_url).toBe(
      'https://praxis.example.com/api/billing/paystack/callback'
    );

    expect(prismaMock.subscription.upsert).toHaveBeenCalledTimes(1);
    const upsertArg = prismaMock.subscription.upsert.mock.calls[0][0] as {
      create: { provider: string; providerSubscriptionId: string };
    };
    expect(upsertArg.create.provider).toBe('paystack');
    expect(upsertArg.create.providerSubscriptionId).toBe(
      result.providerSubscriptionId
    );
  });

  it('falls back to an administrator email when tenant.email is unset', async () => {
    prismaMock.tenant.findUnique.mockImplementation(
      ({ select }: { select?: { email?: boolean; name?: boolean } }) => {
        if (select?.email !== undefined && select?.name === undefined) {
          return Promise.resolve({ email: null });
        }
        return Promise.resolve({ name: 'Acme Firm', slug: 'acme-firm' });
      }
    );
    prismaMock.user.findFirst.mockResolvedValue({ email: 'admin@example.com' });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: true,
        data: {
          authorization_url: 'https://checkout.paystack.com/admin',
          reference: 'PX-acme-firm-grow-2',
        },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await paystackProvider.createCheckout!({
      tenantId: 'tenant-1',
      plan: 'growth',
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      email: string;
    };
    expect(body.email).toBe('admin@example.com');
    expect(prismaMock.tenant.update).toHaveBeenCalledWith({
      where: { id: 'tenant-1' },
      data: { email: 'admin@example.com' },
    });
  });

  it('surfaces initialize failures clearly', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ status: false, message: 'Invalid key' }),
      })
    );

    await expect(
      paystackProvider.createCheckout!({ tenantId: 'tenant-1', plan: 'growth' })
    ).rejects.toThrow(/Paystack initialize failed/);
  });
});

describe('verifyPaystackSignature', () => {
  it('accepts the official Paystack HMAC scheme and rejects tampering', () => {
    const secret = 'sk_test_secret';
    const rawBody = JSON.stringify({
      event: 'charge.success',
      data: { reference: 'PX-1' },
    });
    const signature = createHmac('sha512', secret)
      .update(rawBody, 'utf8')
      .digest('hex');

    expect(verifyPaystackSignature(rawBody, signature, secret)).toBe(true);
    expect(verifyPaystackSignature(rawBody + 'x', signature, secret)).toBe(false);
    expect(verifyPaystackSignature(rawBody, signature, 'wrong-secret')).toBe(false);
  });
});
