import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isTenantPlan } from '@/lib/plans';

/**
 * Returns an auto-submitting HTML form that POSTs to Ozow hosted checkout.
 * Supports tenant billing (tenantId) or signup checkout (pendingId).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');
  const pendingId = searchParams.get('pendingId');
  const plan = searchParams.get('plan');
  const ref = searchParams.get('ref');

  let payload: Record<string, string> | null = null;

  if (pendingId && ref) {
    const pending = await prisma.pendingSignup.findUnique({
      where: { id: pendingId },
    });
    if (!pending?.paymentPayload || pending.paymentReference !== ref) {
      return NextResponse.json({ error: 'Checkout session expired' }, { status: 410 });
    }
    try {
      payload = JSON.parse(pending.paymentPayload) as Record<string, string>;
    } catch {
      return NextResponse.json({ error: 'Invalid checkout payload' }, { status: 500 });
    }
  } else if (tenantId && plan && ref && isTenantPlan(plan)) {
    const sub = await prisma.subscription.findUnique({ where: { tenantId } });
    if (!sub?.providerCustomerId) {
      return NextResponse.json({ error: 'Checkout session expired' }, { status: 410 });
    }
    try {
      payload = JSON.parse(sub.providerCustomerId) as Record<string, string>;
    } catch {
      return NextResponse.json({ error: 'Invalid checkout payload' }, { status: 500 });
    }
    if (payload.transactionReference !== ref) {
      return NextResponse.json({ error: 'Reference mismatch' }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: 'Invalid checkout request' }, { status: 400 });
  }

  const fields = [
    'SiteCode',
    'CountryCode',
    'CurrencyCode',
    'Amount',
    'TransactionReference',
    'BankReference',
    'CancelUrl',
    'ErrorUrl',
    'SuccessUrl',
    'NotifyUrl',
    'IsTest',
    'HashCheck',
  ] as const;

  const values: Record<string, string> = {
    SiteCode: payload.siteCode,
    CountryCode: payload.countryCode,
    CurrencyCode: payload.currencyCode,
    Amount: payload.amount,
    TransactionReference: payload.transactionReference,
    BankReference: payload.bankReference,
    CancelUrl: payload.cancelUrl,
    ErrorUrl: payload.errorUrl,
    SuccessUrl: payload.successUrl,
    NotifyUrl: payload.notifyUrl,
    IsTest: payload.isTest,
    HashCheck: payload.hashCheck,
  };

  const inputs = fields
    .map(
      (name) =>
        `<input type="hidden" name="${name}" value="${String(values[name] || '').replace(/"/g, '&quot;')}" />`
    )
    .join('\n');

  const html = `<!DOCTYPE html>
<html><head><title>Redirecting to Ozow…</title></head>
<body>
<p>Redirecting to secure payment…</p>
<form id="ozow" method="POST" action="https://pay.ozow.com">
${inputs}
</form>
<script>document.getElementById('ozow').submit();</script>
</body></html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
