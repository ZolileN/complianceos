import { NextResponse } from 'next/server';
import { assertCronAuthorized } from '@/lib/compliance-monitor';
import {
  expireTrialsDue,
  finalizeCanceledSubscriptions,
  markLapsedSubscriptions,
} from '@/lib/billing/service';

export const dynamic = 'force-dynamic';

/**
 * Daily billing status sweep:
 * - expire trials → past_due (read-only) until payment
 * - finalize cancel-at-period-end → canceled
 * - lapse month-to-month plans unpaid past the 7-day grace window → past_due
 * Auth: Authorization: Bearer ${CRON_SECRET}
 */
export async function GET(request: Request) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  try {
    const trials = await expireTrialsDue();
    const canceled = await finalizeCanceledSubscriptions();
    const lapsed = await markLapsedSubscriptions();
    return NextResponse.json({ ok: true, ...trials, ...canceled, ...lapsed });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Trial expiry failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
