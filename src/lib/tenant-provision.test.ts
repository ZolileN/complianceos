import { beforeEach, describe, expect, it, vi } from 'vitest';

import { allocateUniqueTenantSlug, slugifyFirmName } from '@/lib/tenant-provision';

describe('slugifyFirmName', () => {
  it('normalizes firm names into URL-safe slugs', () => {
    expect(slugifyFirmName('Volt Advance (Pty) Ltd')).toBe('volt-advance-pty-ltd');
  });
});

describe('allocateUniqueTenantSlug', () => {
  const findUnique = vi.fn();

  beforeEach(() => {
    findUnique.mockReset();
  });

  it('returns the base slug when available', async () => {
    findUnique.mockResolvedValue(null);

    const slug = await allocateUniqueTenantSlug('VoltAdvance', {
      tenant: { findUnique },
    });

    expect(slug).toBe('voltadvance');
    expect(findUnique).toHaveBeenCalledWith({ where: { slug: 'voltadvance' } });
  });

  it('appends a suffix when the base slug is taken', async () => {
    findUnique
      .mockResolvedValueOnce({ id: 'existing' })
      .mockResolvedValueOnce(null);

    const slug = await allocateUniqueTenantSlug('VoltAdvance', {
      tenant: { findUnique },
    });

    expect(slug).toMatch(/^voltadvance-[a-z0-9]{4}$/);
  });
});
