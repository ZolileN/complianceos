import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    tenant: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import { resolveTenantBillingEmail } from '@/lib/billing/tenant-email';

const prismaMock = prisma as unknown as {
  tenant: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  user: {
    findFirst: ReturnType<typeof vi.fn>;
  };
};

describe('resolveTenantBillingEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.tenant.update.mockResolvedValue({});
  });

  it('returns tenant.email when set', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({
      email: 'billing@firm.co.za',
    });

    const email = await resolveTenantBillingEmail('tenant-1');

    expect(email).toBe('billing@firm.co.za');
    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.tenant.update).not.toHaveBeenCalled();
  });

  it('falls back to the first administrator email and backfills tenant.email', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({ email: null });
    prismaMock.user.findFirst.mockResolvedValueOnce({
      email: 'admin@firm.co.za',
    });

    const email = await resolveTenantBillingEmail('tenant-1');

    expect(email).toBe('admin@firm.co.za');
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-1',
          role: 'administrator',
        }),
      })
    );
    expect(prismaMock.tenant.update).toHaveBeenCalledWith({
      where: { id: 'tenant-1' },
      data: { email: 'admin@firm.co.za' },
    });
  });

  it('does not backfill when backfill is false', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({ email: null });
    prismaMock.user.findFirst.mockResolvedValueOnce({
      email: 'admin@firm.co.za',
    });

    const email = await resolveTenantBillingEmail('tenant-1', { backfill: false });

    expect(email).toBe('admin@firm.co.za');
    expect(prismaMock.tenant.update).not.toHaveBeenCalled();
  });

  it('throws a helpful error when no email can be resolved', async () => {
    prismaMock.tenant.findUnique.mockResolvedValue({ email: null });
    prismaMock.user.findFirst.mockResolvedValue(null);

    await expect(resolveTenantBillingEmail('tenant-1')).rejects.toThrow(
      /No billing email found/
    );
  });
});
