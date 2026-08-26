import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { CipcDirectProvider } from '@/lib/integrations/cipc/provider-direct';
import { resetCipcOAuthCache } from '@/lib/integrations/cipc/oauth';

describe('CipcDirectProvider', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    resetCipcOAuthCache();
    process.env.CIPC_API_BASE_URL = 'https://cipc.example.com';
    process.env.CIPC_SUBSCRIPTION_KEY = 'sub-key';
    process.env.CIPC_OAUTH_TOKEN_URL = 'https://auth.example.com/token';
    process.env.CIPC_CLIENT_ID = 'client-id';
    process.env.CIPC_CLIENT_SECRET = 'client-secret';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    resetCipcOAuthCache();
    delete process.env.CIPC_API_BASE_URL;
    delete process.env.CIPC_SUBSCRIPTION_KEY;
    delete process.env.CIPC_OAUTH_TOKEN_URL;
    delete process.env.CIPC_CLIENT_ID;
    delete process.env.CIPC_CLIENT_SECRET;
  });

  it('returns company profile when API responds successfully', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token-123', expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          companyName: 'Acme Trading (Pty) Ltd',
          registrationDate: '15/03/2020',
          status: 'In Business',
        }),
      }) as typeof fetch;

    const provider = new CipcDirectProvider();
    const profile = await provider.getCompanyProfile('2020/123456/07');

    expect(profile?.companyName).toBe('Acme Trading (Pty) Ltd');
    expect(profile?.source).toBe('direct');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('returns null when credentials are missing', async () => {
    delete process.env.CIPC_API_BASE_URL;
    const provider = new CipcDirectProvider();
    expect(await provider.getCompanyProfile('2020/123456/07')).toBeNull();
  });
});
