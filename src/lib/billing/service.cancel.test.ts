import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    subscription: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/admin-audit', () => ({
  logAdminAction: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from '@/lib/prisma';
import { finalizeCanceledSubscriptions } from '@/lib/billing/service';

const prismaMock = prisma as unknown as {
  subscription: {
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

describe('finalizeCanceledSubscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.subscription.update.mockResolvedValue({});
  });

  it('marks cancel-at-period-end subscriptions as canceled', async () => {
    prismaMock.subscription.findMany.mockResolvedValue([
      {
        tenantId: 't1',
        plan: 'growth',
        currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
      },
    ]);

    const result = await finalizeCanceledSubscriptions(
      new Date('2026-07-01T00:00:00.000Z')
    );

    expect(result.canceled).toBe(1);
    expect(prismaMock.subscription.update).toHaveBeenCalledWith({
      where: { tenantId: 't1' },
      data: expect.objectContaining({
        status: 'canceled',
        cancelAtPeriodEnd: false,
      }),
    });
  });
});
