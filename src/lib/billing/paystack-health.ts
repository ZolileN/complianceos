/**
 * Paystack credential probe for admin diagnostics.
 * Calls GET /balance so Infrastructure shows live API key validity.
 */

export type PaystackHealth = {
  ok: boolean;
  configured: boolean;
  detail: string;
  error?: string;
  latencyMs: number | null;
};

export async function checkPaystackCredentials(): Promise<PaystackHealth> {
  const secretKey = (process.env.PAYSTACK_SECRET_KEY || '').trim();
  if (!secretKey) {
    return {
      ok: false,
      configured: false,
      detail:
        'Paystack not configured. Set PAYSTACK_SECRET_KEY from the Paystack dashboard (Settings → API Keys).',
      error: 'not_configured',
      latencyMs: null,
    };
  }

  const apiUrl = (
    process.env.PAYSTACK_API_URL ?? 'https://api.paystack.co'
  ).replace(/\/$/, '');

  const start = Date.now();
  try {
    const res = await fetch(`${apiUrl}/balance`, {
      headers: { Authorization: `Bearer ${secretKey}` },
      cache: 'no-store',
    });
    const latencyMs = Date.now() - start;
    const text = await res.text();
    let parsed: { status?: boolean; message?: string } | null = null;
    try {
      parsed = JSON.parse(text) as { status?: boolean; message?: string };
    } catch {
      parsed = null;
    }

    if (res.ok && parsed?.status) {
      const mode = secretKey.startsWith('sk_live_') ? 'live' : 'test';
      return {
        ok: true,
        configured: true,
        detail: `Paystack API key valid (${mode} mode).`,
        latencyMs,
      };
    }

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        configured: true,
        detail:
          'Paystack rejected the secret key. Copy the current Secret Key from Paystack → Settings → API Keys & Webhooks.',
        error: 'invalid_key',
        latencyMs,
      };
    }

    return {
      ok: false,
      configured: true,
      detail: `Paystack balance check failed (HTTP ${res.status}): ${parsed?.message ?? text.slice(0, 200)}`,
      error: 'api_error',
      latencyMs,
    };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      detail: err instanceof Error ? err.message : 'Paystack request failed',
      error: 'request_failed',
      latencyMs: Date.now() - start,
    };
  }
}
