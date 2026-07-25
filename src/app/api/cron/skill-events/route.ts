import { NextResponse } from 'next/server';
import { assertCronAuthorized } from '@/lib/compliance-monitor';
import { processSkillEventQueue } from '@/lib/skill-triggers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Drain Redis skill event queue (compliance + other module events).
 * Auth: Authorization: Bearer ${CRON_SECRET}
 */
export async function GET(request: Request) {
  const denied = assertCronAuthorized(request);
  if (denied) return denied;

  try {
    let total = 0;
    // Process several batches per invocation
    for (let i = 0; i < 5; i++) {
      const n = await processSkillEventQueue();
      total += n;
      if (n === 0) break;
    }
    return NextResponse.json({ ok: true, processed: total });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Skill queue processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
