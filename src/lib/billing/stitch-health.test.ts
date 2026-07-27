import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkStitchCredentials } from '@/lib/billing/stitch-health';

describe('checkStitchCredentials (Stitch Express)', () => {
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

  it('maps rejected credentials into an actionable diagnostic', async () => {
    vi.stubEnv('STITCH_CLIENT_ID', 'test-client');
    vi.stubEnv('STITCH_CLIENT_SECRET', 'stale-secret');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ success: false }),
      })
    );

    const result = await checkStitchCredentials();
    expect(result.ok).toBe(false);
    expect(result.error).toBe('invalid_client');
    expect(result.detail).toContain('Stitch Express dashboard');
  });

  it('reports ok when an Express access token is issued', async () => {
    vi.stubEnv('STITCH_CLIENT_ID', 'test-client');
    vi.stubEnv('STITCH_CLIENT_SECRET', 'good-secret');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({ success: true, data: { accessToken: 'tok' } }),
      })
    );

    const result = await checkStitchCredentials();
    expect(result.ok).toBe(true);
    expect(result.detail).toContain('credentials valid');
  });
});
