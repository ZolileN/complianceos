import { NextResponse } from 'next/server';
import { assertCronAuthorized } from '@/lib/compliance-monitor';
import { runCipcRegistrySyncAllTenants } from '@/lib/integrations/cipc/sync';
import { captureRouteError } from '@/lib/monitoring';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Daily CIPC registry sync for clients with registration numbers.
 * Auth: Authorization: Bearer ${CRON_SECRET}
 */
export async function GET(request: Request) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  try {
    const result = await runCipcRegistrySyncAllTenants();
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    captureRouteError(err, 'cron:cipc-registry-sync');
    const message = err instanceof Error ? err.message : 'CIPC sync failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
