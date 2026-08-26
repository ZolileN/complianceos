import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getBillingProviderMock } = vi.hoisted(() => ({
  getBillingProviderMock: vi.fn(),
}));

vi.mock('@/lib/billing/provider', () => ({
  getBillingProvider: getBillingProviderMock,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    tenant: {
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/admin-audit', () => ({
  logAdminAction: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from '@/lib/prisma';
import { startCheckout } from '@/lib/billing/service';

const prismaMock = prisma as unknown as {
  subscription: {
    findUnique: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
  tenant: {
    update: ReturnType<typeof vi.fn>;
  };
};

const paystackProvider = {
  id: 'paystack' as const,
  createCheckout: vi.fn(),
};

const ozowProvider = {
  id: 'ozow' as const,
  createCheckout: vi.fn(),
};

describe('startCheckout provider selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.subscription.findUnique.mockResolvedValue(null);
    prismaMock.subscription.upsert.mockResolvedValue({});
    prismaMock.tenant.update.mockResolvedValue({});
  });

  it('uses Paystack when it is the configured provider', async () => {
    getBillingProviderMock.mockReturnValue(paystackProvider);
    paystackProvider.createCheckout.mockResolvedValue({
      checkoutUrl: 'https://checkout.paystack.com/abc',
      providerSubscriptionId: 'PX-ref-1',
      providerPlanId: 'growth',
    });

    const result = await startCheckout('tenant-1', 'growth');

    expect(result).toEqual({
      checkoutUrl: 'https://checkout.paystack.com/abc',
      provider: 'paystack',
    });
    expect(paystackProvider.createCheckout).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      plan: 'growth',
    });
    expect(ozowProvider.createCheckout).not.toHaveBeenCalled();
    expect(prismaMock.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ provider: 'paystack' }),
        update: expect.objectContaining({ provider: 'paystack' }),
      })
    );
  });

  it('uses Ozow only when Paystack is not configured', async () => {
    getBillingProviderMock.mockReturnValue(ozowProvider);
    ozowProvider.createCheckout.mockResolvedValue({
      checkoutUrl: '/api/billing/ozow/redirect?ref=PX-1',
      providerSubscriptionId: 'PX-1',
      providerPlanId: 'starter',
    });

    const result = await startCheckout('tenant-2', 'starter');

    expect(result).toEqual({
      checkoutUrl: '/api/billing/ozow/redirect?ref=PX-1',
      provider: 'ozow',
    });
    expect(ozowProvider.createCheckout).toHaveBeenCalledWith({
      tenantId: 'tenant-2',
      plan: 'starter',
    });
    expect(paystackProvider.createCheckout).not.toHaveBeenCalled();
  });

  it('does not fall back to Ozow when Paystack checkout fails', async () => {
    getBillingProviderMock.mockReturnValue(paystackProvider);
    paystackProvider.createCheckout.mockRejectedValue(
      new Error('Paystack initialize failed (HTTP 401): Invalid key')
    );

    await expect(startCheckout('tenant-3', 'growth')).rejects.toThrow(
      /Paystack initialize failed/
    );
    expect(ozowProvider.createCheckout).not.toHaveBeenCalled();
  });
});
