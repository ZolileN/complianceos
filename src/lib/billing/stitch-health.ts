/**
 * Stitch credential probe for admin diagnostics.
 * Requests a client token so Infrastructure can show the real auth failure
 * (unknown client / bad secret) instead of a checkout-time surprise.
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

  const tokenUrl =
    process.env.STITCH_TOKEN_URL || 'https://secure.stitch.money/connect/token';
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    audience: 'https://secure.stitch.money/connect/token',
    scope: 'client_paymentrequest',
  });

  const start = Date.now();
  try {
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
    });
    const latencyMs = Date.now() - start;
    const text = await res.text();

    if (res.ok) {
      return {
        ok: true,
        configured: true,
        detail: 'Stitch client token issued (credentials valid).',
        latencyMs,
      };
    }

    let errorCode = '';
    try {
      errorCode = (JSON.parse(text) as { error?: string }).error || '';
    } catch {
      errorCode = '';
    }

    if (errorCode === 'invalid_client') {
      return {
        ok: false,
        configured: true,
        detail:
          'Stitch rejected the client (invalid_client). The client ID does not exist or the secret is wrong — generate fresh credentials in the Stitch Dashboard and update STITCH_CLIENT_ID / STITCH_CLIENT_SECRET.',
        error: 'invalid_client',
        latencyMs,
      };
    }
    if (errorCode === 'invalid_scope') {
      return {
        ok: false,
        configured: true,
        detail:
          'Stitch client is valid but lacks the client_paymentrequest scope. Ask Stitch support to enable the required scopes.',
        error: 'invalid_scope',
        latencyMs,
      };
    }

    return {
      ok: false,
      configured: true,
      detail: `Stitch token error (HTTP ${res.status}): ${text.slice(0, 200)}`,
      error: errorCode || 'token_error',
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
