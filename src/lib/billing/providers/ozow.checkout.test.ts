import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(),
    },
    subscription: {
      upsert: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { ozowProvider } from '@/lib/billing/providers/ozow';

const prismaMock = prisma as unknown as {
  tenant: { findUnique: ReturnType<typeof vi.fn> };
  subscription: { upsert: ReturnType<typeof vi.fn> };
};

describe('ozowProvider.createCheckout', () => {
  const productionAppUrl = 'https://praxis.mlkcomputer.com';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OZOW_SITE_CODE = 'TESTSITE';
    process.env.OZOW_PRIVATE_KEY = 'test-private-key';
    process.env.OZOW_API_KEY = 'test-api-key';
    process.env.OZOW_IS_TEST = 'true';
    process.env.NEXT_PUBLIC_APP_URL = productionAppUrl;

    prismaMock.tenant.findUnique.mockResolvedValue({
      name: 'Acme Firm',
      email: 'owner@example.com',
      slug: 'acme-firm',
    });
    prismaMock.subscription.upsert.mockResolvedValue({});
  });

  it('returns a relative checkout redirect even when NEXT_PUBLIC_APP_URL is production', async () => {
    const result = await ozowProvider.createCheckout!({
      tenantId: 'tenant-1',
      plan: 'growth',
    });

    expect(result.checkoutUrl).toMatch(
      /^\/api\/billing\/ozow\/redirect\?ref=PX-acme-firm-grow-\d+&plan=growth&tenantId=tenant-1$/
    );
    expect(result.checkoutUrl).not.toContain(productionAppUrl);
    expect(result.checkoutUrl).not.toMatch(/^https?:\/\//);

    expect(prismaMock.subscription.upsert).toHaveBeenCalledTimes(1);
    const upsertArg = prismaMock.subscription.upsert.mock.calls[0][0] as {
      create: { providerCustomerId: string };
    };
    const payload = JSON.parse(upsertArg.create.providerCustomerId) as {
      cancelUrl: string;
      errorUrl: string;
      successUrl: string;
      notifyUrl: string;
    };

    expect(payload.cancelUrl).toBe(`${productionAppUrl}/pay/c`);
    expect(payload.errorUrl).toBe(`${productionAppUrl}/pay/e`);
    expect(payload.successUrl).toBe(`${productionAppUrl}/pay/s`);
    expect(payload.notifyUrl).toBe(
      `${productionAppUrl}/api/billing/ozow/webhook`
    );
    expect(payload.cancelUrl.length).toBeLessThanOrEqual(50);
  });
});
