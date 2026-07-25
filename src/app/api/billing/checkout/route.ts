import { NextRequest, NextResponse } from 'next/server';
import {
  isRbacResponse,
  requireManager,
  requireTenantSession,
} from '@/lib/rbac';
import { isTenantPlan } from '@/lib/plans';
import { startCheckout } from '@/lib/billing/service';

/**
 * POST { plan } — start checkout / activate via configured billing provider.
 */
export async function POST(request: NextRequest) {
  const user = await requireTenantSession();
  if (isRbacResponse(user)) return user;
  const forbidden = requireManager(user);
  if (forbidden) return forbidden;

  try {
    const body = await request.json();
    const plan = body.plan as string;
    if (!isTenantPlan(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }
    if (plan === 'enterprise') {
      return NextResponse.json(
        { error: 'Enterprise requires contacting sales', code: 'CONTACT_SALES' },
        { status: 400 }
      );
    }

    const result = await startCheckout(user.tenantId!, plan);
    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Checkout failed' },
      { status: 500 }
    );
  }
}
