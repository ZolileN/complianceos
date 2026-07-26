import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkStitchCredentials } from '@/lib/billing/stitch-health';

describe('checkStitchCredentials', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('reports not_configured when Stitch env is missing', async () => {
    vi.stubEnv('STITCH_CLIENT_ID', '');
    vi.stubEnv('STITCH_CLIENT_SECRET', '');

    const result = await checkStitchCredentials();
    expect(result.ok).toBe(false);
    expect(result.configured).toBe(false);
    expect(result.error).toBe('not_configured');
  });

  it('maps invalid_client into an actionable diagnostic', async () => {
    vi.stubEnv('STITCH_CLIENT_ID', 'test-dead-client');
    vi.stubEnv('STITCH_CLIENT_SECRET', 'secret');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: 'invalid_client' }),
      })
    );

    const result = await checkStitchCredentials();
    expect(result.ok).toBe(false);
    expect(result.error).toBe('invalid_client');
    expect(result.detail).toContain('Stitch Dashboard');
  });

  it('reports ok when a token is issued', async () => {
    vi.stubEnv('STITCH_CLIENT_ID', 'test-live-client');
    vi.stubEnv('STITCH_CLIENT_SECRET', 'secret');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({ access_token: 'tok', expires_in: 3600 }),
      })
    );

    const result = await checkStitchCredentials();
    expect(result.ok).toBe(true);
    expect(result.detail).toContain('credentials valid');
  });
});
