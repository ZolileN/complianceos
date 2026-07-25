import { NextRequest, NextResponse } from 'next/server';
import { isTenantPlan } from '@/lib/plans';
import { createPendingSignupCheckout } from '@/lib/signup-checkout';

/**
 * POST — start pay-before-create checkout for Growth / Professional signup.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const plan = body.plan as string;

    if (!isTenantPlan(plan) || plan === 'starter' || plan === 'enterprise') {
      return NextResponse.json({ error: 'Invalid plan for paid signup' }, { status: 400 });
    }

    const { firmName, fullName, email, password } = body;
    if (!firmName || !fullName || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (String(password).length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const result = await createPendingSignupCheckout({
      firmName,
      fullName,
      email,
      password,
      plan,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Checkout failed';
    const status =
      message.includes('already exists') || message.includes('Invalid') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
