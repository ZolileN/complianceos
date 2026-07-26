import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    tenant: { findUnique: vi.fn() },
    usageCounter: { findUnique: vi.fn() },
    message: { count: vi.fn() },
  },
}));

import { prisma } from '@/lib/prisma';
import {
  ReadOnlyError,
  assertWritable,
  resolveEntitlements,
} from '@/lib/entitlements';

const prismaMock = prisma as unknown as {
  tenant: { findUnique: ReturnType<typeof vi.fn> };
  usageCounter: { findUnique: ReturnType<typeof vi.fn> };
  message: { count: ReturnType<typeof vi.fn> };
};

function tenantFixture(status: string, plan = 'starter') {
  return {
    id: 'tenant-1',
    plan,
    settings: '{}',
    limitsOverride: null,
    subscription: {
      status,
      trialEndsAt: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
    _count: { users: 1, clients: 0, documents: 0 },
  };
}

describe('entitlements read-only gates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.usageCounter.findUnique.mockResolvedValue(null);
    prismaMock.message.count.mockResolvedValue(0);
  });

  it('marks past_due as read-only', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(tenantFixture('past_due'));
    const entitlements = await resolveEntitlements('tenant-1');
    expect(entitlements.readOnly).toBe(true);
    await expect(assertWritable('tenant-1')).rejects.toBeInstanceOf(ReadOnlyError);
  });

  it('marks incomplete checkout as read-only', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(tenantFixture('incomplete'));
    const entitlements = await resolveEntitlements('tenant-1');
    expect(entitlements.readOnly).toBe(true);
  });

  it('allows writes for active subscriptions', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue(tenantFixture('active', 'professional'));
    const entitlements = await assertWritable('tenant-1');
    expect(entitlements.readOnly).toBe(false);
    expect(entitlements.aiEnabled).toBe(true);
  });
});
