import { NextResponse } from 'next/server';
import { assertCronAuthorized } from '@/lib/compliance-monitor';
import { sendRenewalNotices } from '@/lib/billing/renewals';
import { captureRouteError } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';

/**
 * Daily renewal dunning: email a payment link to tenants whose paid period
 * ends within the notice window.
 */
export async function GET(request: Request) {
  const unauthorized = assertCronAuthorized(request);
  if (unauthorized) return unauthorized;

  try {
    const result = await sendRenewalNotices();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    captureRouteError(err, 'cron:billing-renewals');
    const message = err instanceof Error ? err.message : 'Renewal cron failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
