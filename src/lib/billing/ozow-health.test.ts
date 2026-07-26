import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkOzowMerchant } from '@/lib/billing/ozow-health';

describe('checkOzowMerchant', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('reports not_configured when Ozow env is missing', async () => {
    vi.stubEnv('OZOW_SITE_CODE', '');
    vi.stubEnv('OZOW_PRIVATE_KEY', '');
    vi.stubEnv('OZOW_API_KEY', '');

    const result = await checkOzowMerchant();
    expect(result.ok).toBe(false);
    expect(result.configured).toBe(false);
    expect(result.error).toBe('not_configured');
  });

  it('maps Ozow 403 merchant-not-found into a clear diagnostic', async () => {
    vi.stubEnv('OZOW_SITE_CODE', 'BADSITE');
    vi.stubEnv('OZOW_PRIVATE_KEY', 'private');
    vi.stubEnv('OZOW_API_KEY', 'api');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://praxis.mlkcomputer.com');
    vi.stubEnv('OZOW_IS_TEST', 'true');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => '"No merchant found for site code BADSITE"',
      })
    );

    const result = await checkOzowMerchant();
    expect(result.ok).toBe(false);
    expect(result.error).toBe('merchant_not_found');
    expect(result.detail).toContain('No merchant found');
  });

  it('marks merchant OK when Ozow returns a payment URL', async () => {
    vi.stubEnv('OZOW_SITE_CODE', 'GOODSITE');
    vi.stubEnv('OZOW_PRIVATE_KEY', 'private');
    vi.stubEnv('OZOW_API_KEY', 'api');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://praxis.mlkcomputer.com');
    vi.stubEnv('OZOW_IS_TEST', 'true');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            paymentRequestId: 'abc',
            url: 'https://pay.ozow.com/abc',
          }),
      })
    );

    const result = await checkOzowMerchant();
    expect(result.ok).toBe(true);
    expect(result.detail).toContain('Ozow merchant OK');
  });
});
