import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    pendingSignup: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/tenant-provision', () => ({
  createTenantWithAdmin: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { createTenantWithAdmin } from '@/lib/tenant-provision';
import { completePaidPendingSignup } from '@/lib/signup-checkout';

const prismaMock = prisma as unknown as {
  pendingSignup: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  user: { findUnique: ReturnType<typeof vi.fn> };
};
const createTenantMock = createTenantWithAdmin as unknown as ReturnType<typeof vi.fn>;

const paidPending = {
  id: 'pending-1',
  plan: 'professional',
  firmName: 'VoltAdvance',
  fullName: 'Lulibo',
  email: 'owner@example.com',
  passwordHash: 'hashed',
  status: 'paid',
  provider: 'paystack',
  paymentReference: 'PRAXIS-SIGNUP-1',
  expiresAt: new Date(Date.now() + 60_000),
};

describe('completePaidPendingSignup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.pendingSignup.update.mockResolvedValue({});
    prismaMock.pendingSignup.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.user.findUnique.mockResolvedValue(null);
    createTenantMock.mockResolvedValue({
      tenant: { id: 't1', name: 'VoltAdvance', slug: 'voltadvance', plan: 'professional' },
      user: { id: 'u1', email: 'owner@example.com', name: 'Owner' },
    });
  });

  it('provisions a tenant from a paid pending signup', async () => {
    prismaMock.pendingSignup.findUnique.mockResolvedValue(paidPending);

    const result = await completePaidPendingSignup('PRAXIS-SIGNUP-1');

    expect(result.outcome).toBe('created');
    expect(result.tenantSlug).toBe('voltadvance');
    expect(prismaMock.pendingSignup.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'pending-1',
        status: 'paid',
        expiresAt: { gt: expect.any(Date) },
      },
      data: { status: 'provisioning' },
    });
    expect(createTenantMock).toHaveBeenCalledWith(
      expect.objectContaining({
        firmName: 'VoltAdvance',
        passwordHash: 'hashed',
        billingProvider: 'paystack',
      })
    );
    expect(prismaMock.pendingSignup.update).toHaveBeenCalledWith({
      where: { id: 'pending-1' },
      data: { status: 'completed' },
    });
  });

  it('is idempotent when already completed', async () => {
    prismaMock.pendingSignup.findUnique.mockResolvedValue({
      id: 'pending-1',
      email: 'owner@example.com',
      status: 'completed',
      expiresAt: new Date(Date.now() + 60_000),
    });

    const result = await completePaidPendingSignup('PRAXIS-SIGNUP-1');
    expect(result.outcome).toBe('already_completed');
    expect(createTenantMock).not.toHaveBeenCalled();
  });

  it('returns already_exists when the user was created by a concurrent request', async () => {
    prismaMock.pendingSignup.findUnique.mockResolvedValue(paidPending);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', email: 'owner@example.com' });

    const result = await completePaidPendingSignup('PRAXIS-SIGNUP-1');

    expect(result.outcome).toBe('already_exists');
    expect(createTenantMock).not.toHaveBeenCalled();
    expect(prismaMock.pendingSignup.update).toHaveBeenCalledWith({
      where: { id: 'pending-1' },
      data: { status: 'completed' },
    });
  });
});
