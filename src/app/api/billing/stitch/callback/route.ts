import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { activateSubscription } from '@/lib/billing/service';
import { getExpressPaymentStatus } from '@/lib/billing/providers/stitch';
import { markPendingSignupPaid } from '@/lib/signup-checkout';
import { isTenantPlan } from '@/lib/plans';

/**
 * Stitch Express browser redirect after checkout.
 * Query: payment_id + reference (our merchantReference).
 * Handles both tenant upgrades/renewals and pay-before-create signups.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get('payment_id') || searchParams.get('id');
  const reference =
    searchParams.get('reference') || searchParams.get('merchantReference');

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  const redirect = (path: string, billing: string, reason?: string) => {
    const dest = new URL(`${appUrl}${path}`);
    dest.searchParams.set('billing', billing);
    if (reason) dest.searchParams.set('reason', reason);
    return NextResponse.redirect(dest);
  };

  if (!paymentId || !reference) {
    return redirect('/dashboard/billing', 'error', 'missing_payment');
  }

  // Pay-before-create signup?
  const pendingSignup = await prisma.pendingSignup.findUnique({
    where: { paymentReference: reference },
  });
  if (pendingSignup) {
    let status: string | null;
    try {
      status = await getExpressPaymentStatus(paymentId, reference);
    } catch {
      return redirect(
        `/signup`,
        'error',
        'status_check_failed'
      );
    }
    if (status !== 'PAID') {
      const dest = new URL(`${appUrl}/signup`);
      dest.searchParams.set('plan', pendingSignup.plan);
      dest.searchParams.set('billing', 'error');
      return NextResponse.redirect(dest);
    }
    await markPendingSignupPaid(reference);
    const dest = new URL(`${appUrl}/signup`);
    dest.searchParams.set('plan', pendingSignup.plan);
    dest.searchParams.set('pending', pendingSignup.id);
    dest.searchParams.set('billing', 'success');
    return NextResponse.redirect(dest);
  }

  // Tenant upgrade / renewal
  const sub = await prisma.subscription.findFirst({
    where: { providerSubscriptionId: reference },
  });
  if (!sub) {
    return redirect('/dashboard/billing', 'error', 'unknown_reference');
  }

  let status: string | null;
  try {
    status = await getExpressPaymentStatus(paymentId, reference);
  } catch {
    return redirect('/dashboard/billing', 'error', 'status_check_failed');
  }

  if (status !== 'PAID') {
    return redirect(
      '/dashboard/billing',
      'error',
      status === null ? 'payment_not_found' : 'not_paid'
    );
  }

  const plan = isTenantPlan(sub.plan) ? sub.plan : 'starter';
  await activateSubscription(sub.tenantId, {
    plan,
    providerSubscriptionId: reference,
    providerPlanId: sub.providerPlanId || undefined,
  });

  return redirect('/dashboard/billing', 'success');
}
