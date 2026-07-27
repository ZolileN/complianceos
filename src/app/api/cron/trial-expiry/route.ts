import { NextResponse } from 'next/server';
import { assertCronAuthorized } from '@/lib/compliance-monitor';
import {
  expireTrialsDue,
  finalizeCanceledSubscriptions,
  markLapsedSubscriptions,
} from '@/lib/billing/service';
import { captureRouteError } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';

/**
 * Daily billing lifecycle cron:
 * - expire trials that have ended (→ past_due)
 * - finalize cancel-at-period-end subscriptions whose period lapsed
 * - mark paid subscriptions past their grace window as past_due
 */
export async function GET(request: Request) {
  const unauthorized = assertCronAuthorized(request);
  if (unauthorized) return unauthorized;

  try {
    const trials = await expireTrialsDue();
    const canceled = await finalizeCanceledSubscriptions();
    const lapsed = await markLapsedSubscriptions();
    return NextResponse.json({ ok: true, ...trials, ...canceled, ...lapsed });
  } catch (err: unknown) {
    captureRouteError(err, 'cron:trial-expiry');
    const message = err instanceof Error ? err.message : 'Trial expiry failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
