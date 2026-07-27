import { NextRequest, NextResponse } from 'next/server';
import {
  completePaidPendingSignupById,
  signupCompleteLoginUrl,
} from '@/lib/signup-checkout';

/**
 * Finalize a paid signup session and return the login redirect target.
 * Idempotent — safe to call from the signup page after payment return.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pendingSignupId = String(body.pendingSignupId || '').trim();
    if (!pendingSignupId) {
      return NextResponse.json({ error: 'Missing pending signup id' }, { status: 400 });
    }

    const result = await completePaidPendingSignupById(pendingSignupId);

    return NextResponse.json({
      data: {
        outcome: result.outcome,
        email: result.email,
        tenantSlug: result.tenantSlug ?? null,
        loginUrl: signupCompleteLoginUrl(result.email),
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to complete signup';
    const status =
      message.includes('not found') ||
      message.includes('Payment') ||
      message.includes('expired')
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
