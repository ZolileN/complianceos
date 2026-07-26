import { NextResponse } from 'next/server';
import { assertCronAuthorized } from '@/lib/compliance-monitor';
import { expireTrialsDue, markLapsedSubscriptions } from '@/lib/billing/service';
import { captureRouteError } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';

/**
 * Daily billing status sweep:
 * - expire trials → past_due (read-only) until payment
 * - lapse month-to-month plans unpaid past the 7-day grace window → past_due
 * Auth: Authorization: Bearer ${CRON_SECRET}
 */
export async function GET(request: Request) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  try {
    const trials = await expireTrialsDue();
    const lapsed = await markLapsedSubscriptions();
    return NextResponse.json({ ok: true, ...trials, ...lapsed });
  } catch (err: unknown) {
    captureRouteError(err, 'cron:trial-expiry');
    const message = err instanceof Error ? err.message : 'Trial expiry failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
