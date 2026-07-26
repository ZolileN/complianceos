/**
 * Lightweight Ozow merchant/credential probe for admin diagnostics.
 * Calls Ozow's payment-request API so we get a clear errorMessage instead of
 * the generic hosted-checkout "An error has occurred."
 */

import { buildOzowHash } from '@/lib/billing/providers/ozow';

export type OzowHealth = {
  ok: boolean;
  configured: boolean;
  siteCodeConfigured: boolean;
  detail: string;
  error?: string;
  latencyMs: number | null;
};

function ozowEnv() {
  return {
    siteCode: (process.env.OZOW_SITE_CODE || '').trim(),
    privateKey: (process.env.OZOW_PRIVATE_KEY || '').trim(),
    apiKey: (process.env.OZOW_API_KEY || '').trim(),
    appUrl: (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, ''),
    isTest: (process.env.OZOW_IS_TEST || '').toLowerCase() === 'true',
  };
}

export async function checkOzowMerchant(): Promise<OzowHealth> {
  const { siteCode, privateKey, apiKey, appUrl, isTest } = ozowEnv();
  if (!siteCode || !privateKey || !apiKey) {
    return {
      ok: false,
      configured: false,
      siteCodeConfigured: Boolean(siteCode),
      detail:
        'Ozow not configured. Set OZOW_SITE_CODE, OZOW_PRIVATE_KEY, and OZOW_API_KEY.',
      error: 'not_configured',
      latencyMs: null,
    };
  }
  if (!appUrl) {
    return {
      ok: false,
      configured: true,
      siteCodeConfigured: true,
      detail:
        'NEXT_PUBLIC_APP_URL is required for Ozow Cancel/Error/Success/Notify URLs.',
      error: 'missing_app_url',
      latencyMs: null,
    };
  }

  const amount = '1.00';
  const transactionReference = `PXDIAG-${Date.now()}`.slice(0, 50);
  const bankReference = 'PraxisDiag'.slice(0, 20);
  const cancelUrl = `${appUrl}/pay/c`;
  const errorUrl = `${appUrl}/pay/e`;
  const successUrl = `${appUrl}/pay/s`;
  const notifyUrl = `${appUrl}/api/billing/ozow/webhook`;
  const isTestStr = isTest ? 'true' : 'false';

  const hashCheck = buildOzowHash(
    [
      siteCode,
      'ZA',
      'ZAR',
      amount,
      transactionReference,
      bankReference,
      cancelUrl,
      errorUrl,
      successUrl,
      notifyUrl,
      isTestStr,
    ],
    privateKey
  );

  const payload = {
    SiteCode: siteCode,
    CountryCode: 'ZA',
    CurrencyCode: 'ZAR',
    Amount: amount,
    TransactionReference: transactionReference,
    BankReference: bankReference,
    CancelUrl: cancelUrl,
    ErrorUrl: errorUrl,
    SuccessUrl: successUrl,
    NotifyUrl: notifyUrl,
    IsTest: isTest,
    HashCheck: hashCheck,
  };

  const start = Date.now();
  try {
    const res = await fetch('https://api.ozow.com/postpaymentrequest', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ApiKey: apiKey,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    const latencyMs = Date.now() - start;
    const text = await res.text();
    let parsed: {
      errorMessage?: string;
      url?: string;
      paymentRequestId?: string;
    } | null = null;
    try {
      parsed = JSON.parse(text) as {
        errorMessage?: string;
        url?: string;
        paymentRequestId?: string;
      };
    } catch {
      parsed = null;
    }

    if (
      res.ok &&
      parsed &&
      (parsed.url || parsed.paymentRequestId) &&
      !parsed.errorMessage
    ) {
      return {
        ok: true,
        configured: true,
        siteCodeConfigured: true,
        detail: 'Ozow merchant OK (site configured, API accepted test request).',
        latencyMs,
      };
    }

    const message =
      parsed?.errorMessage ||
      (text.startsWith('"') ? text.replace(/^"|"$/g, '') : text) ||
      `Ozow API returned HTTP ${res.status}`;

    return {
      ok: false,
      configured: true,
      siteCodeConfigured: true,
      detail: message,
      error: res.status === 403 ? 'merchant_not_found' : 'ozow_rejected',
      latencyMs,
    };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      siteCodeConfigured: true,
      detail: err instanceof Error ? err.message : 'Ozow API request failed',
      error: 'request_failed',
      latencyMs: Date.now() - start,
    };
  }
}
