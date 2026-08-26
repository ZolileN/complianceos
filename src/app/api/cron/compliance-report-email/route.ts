import { NextResponse } from 'next/server';
import { assertCronAuthorized } from '@/lib/compliance-monitor';
import { runComplianceReportEmailJob } from '@/lib/compliance-report-email';
import { captureRouteError } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Weekly compliance portfolio report email.
 * Auth: Authorization: Bearer ${CRON_SECRET}
 */
export async function GET(request: Request) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  try {
    const result = await runComplianceReportEmailJob();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    captureRouteError(err, 'cron:compliance-report-email');
    const message = err instanceof Error ? err.message : 'Report email job failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
