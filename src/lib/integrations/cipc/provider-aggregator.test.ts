import { describe, expect, it, vi, afterEach } from 'vitest';

import { CipcAggregatorProvider } from '@/lib/integrations/cipc/provider-aggregator';

describe('CipcAggregatorProvider', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.CIPC_AGGREGATOR_BASE_URL;
    delete process.env.CIPC_AGGREGATOR_API_KEY;
  });

  it('returns company profile from aggregator API', async () => {
    process.env.CIPC_AGGREGATOR_BASE_URL = 'https://aggregator.example.com';
    process.env.CIPC_AGGREGATOR_API_KEY = 'agg-key';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        name: 'Beta Services CC',
        incorporationDate: '01/01/2018',
        companyStatus: 'Active',
      }),
    }) as typeof fetch;

    const provider = new CipcAggregatorProvider();
    const profile = await provider.getCompanyProfile('2018/987654/23');

    expect(profile?.companyName).toBe('Beta Services CC');
    expect(profile?.source).toBe('aggregator');
  });

  it('returns null when aggregator is not configured', async () => {
    const provider = new CipcAggregatorProvider();
    expect(await provider.getCompanyProfile('2018/987654/23')).toBeNull();
  });
});
