/**
 * Stitch Express credential probe for admin diagnostics.
 * Requests a token from express.stitch.money so Infrastructure shows the
 * real auth state instead of a checkout-time surprise.
 */

export type StitchHealth = {
  ok: boolean;
  configured: boolean;
  detail: string;
  error?: string;
  latencyMs: number | null;
};

export async function checkStitchCredentials(): Promise<StitchHealth> {
  const clientId = (process.env.STITCH_CLIENT_ID || '').trim();
  const clientSecret = (process.env.STITCH_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) {
    return {
      ok: false,
      configured: false,
      detail:
        'Stitch not configured. Set STITCH_CLIENT_ID and STITCH_CLIENT_SECRET.',
      error: 'not_configured',
      latencyMs: null,
    };
  }

  const apiUrl = (
    process.env.STITCH_EXPRESS_API_URL ?? 'https://express.stitch.money'
  ).replace(/\/$/, '');

  const start = Date.now();
  try {
    const res = await fetch(`${apiUrl}/api/v1/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret }),
      cache: 'no-store',
    });
    const latencyMs = Date.now() - start;
    const text = await res.text();
    let parsed: { success?: boolean; data?: { accessToken?: string } } | null =
      null;
    try {
      parsed = JSON.parse(text) as {
        success?: boolean;
        data?: { accessToken?: string };
      };
    } catch {
      parsed = null;
    }

    if (res.ok && parsed?.success && parsed.data?.accessToken) {
      return {
        ok: true,
        configured: true,
        detail: 'Stitch Express token issued (credentials valid).',
        latencyMs,
      };
    }

    if (res.status === 401 || res.status === 403 || res.status === 400) {
      return {
        ok: false,
        configured: true,
        detail:
          'Stitch Express rejected the credentials. Copy the current Client ID and Client Secret from the Stitch Express dashboard (API Details) — note the secret regenerates each time it is viewed.',
        error: 'invalid_client',
        latencyMs,
      };
    }

    return {
      ok: false,
      configured: true,
      detail: `Stitch Express token error (HTTP ${res.status}): ${text.slice(0, 200)}`,
      error: 'token_error',
      latencyMs,
    };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      detail: err instanceof Error ? err.message : 'Stitch token request failed',
      error: 'request_failed',
      latencyMs: Date.now() - start,
    };
  }
}
