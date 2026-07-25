import { NextResponse } from 'next/server';
import {
  assertCronAuthorized,
  runComplianceDeadlineCheck,
} from '@/lib/compliance-monitor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Daily compliance deadline / escalation job.
 * Auth: Authorization: Bearer ${CRON_SECRET}
 */
export async function GET(request: Request) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  try {
    const result = await runComplianceDeadlineCheck();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Deadline check failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
