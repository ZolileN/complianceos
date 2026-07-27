import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkPaystackCredentials } from '@/lib/billing/paystack-health';

describe('checkPaystackCredentials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('reports not_configured when Paystack env is missing', async () => {
    vi.stubEnv('PAYSTACK_SECRET_KEY', '');

    const result = await checkPaystackCredentials();
    expect(result.ok).toBe(false);
    expect(result.configured).toBe(false);
    expect(result.error).toBe('not_configured');
  });

  it('reports invalid_key when Paystack rejects the secret', async () => {
    vi.stubEnv('PAYSTACK_SECRET_KEY', 'sk_test_stale');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ status: false, message: 'Invalid key' }),
      })
    );

    const result = await checkPaystackCredentials();
    expect(result.ok).toBe(false);
    expect(result.configured).toBe(true);
    expect(result.error).toBe('invalid_key');
    expect(result.detail).toContain('Paystack');
  });

  it('reports ok when balance check succeeds', async () => {
    vi.stubEnv('PAYSTACK_SECRET_KEY', 'sk_test_good');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: true, data: [] }),
      })
    );

    const result = await checkPaystackCredentials();
    expect(result.ok).toBe(true);
    expect(result.configured).toBe(true);
    expect(result.detail).toContain('test mode');
  });
});
