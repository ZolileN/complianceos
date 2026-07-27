import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { activateSubscription } from '@/lib/billing/service';
import { getPaystackTransactionStatus } from '@/lib/billing/providers/paystack';
import {
  completePaidPendingSignup,
  markPendingSignupPaid,
  signupCompleteLoginUrl,
} from '@/lib/signup-checkout';
import { isTenantPlan } from '@/lib/plans';

/**
 * Paystack browser redirect after checkout.
 * Query: reference (or trxref — Paystack sends both).
 * Handles tenant upgrades/renewals and pay-before-create signups.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const reference =
    searchParams.get('reference') || searchParams.get('trxref');

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  const redirect = (path: string, billing: string, reason?: string) => {
    const dest = new URL(`${appUrl}${path}`);
    dest.searchParams.set('billing', billing);
    if (reason) dest.searchParams.set('reason', reason);
    return NextResponse.redirect(dest);
  };

  if (!reference) {
    return redirect('/dashboard/billing', 'error', 'missing_reference');
  }

  // Pay-before-create signup?
  const pendingSignup = await prisma.pendingSignup.findUnique({
    where: { paymentReference: reference },
  });
  if (pendingSignup) {
    let status: string | null;
    try {
      status = await getPaystackTransactionStatus(reference);
    } catch {
      return redirect('/signup', 'error', 'status_check_failed');
    }
    if (status !== 'success') {
      const dest = new URL(`${appUrl}/signup`);
      dest.searchParams.set('plan', pendingSignup.plan);
      dest.searchParams.set('billing', 'error');
      return NextResponse.redirect(dest);
    }
    await markPendingSignupPaid(reference);
    try {
      const result = await completePaidPendingSignup(reference);
      return NextResponse.redirect(signupCompleteLoginUrl(result.email, appUrl));
    } catch (err) {
      console.error('[paystack callback] signup finalize failed', err);
      const dest = new URL(`${appUrl}/signup`);
      dest.searchParams.set('plan', pendingSignup.plan);
      dest.searchParams.set('pending', pendingSignup.id);
      dest.searchParams.set('billing', 'error');
      dest.searchParams.set('reason', 'provision_failed');
      return NextResponse.redirect(dest);
    }
  }

  const sub = await prisma.subscription.findFirst({
    where: { providerSubscriptionId: reference },
  });
  if (!sub) {
    return redirect('/dashboard/billing', 'error', 'unknown_reference');
  }

  let status: string | null;
  try {
    status = await getPaystackTransactionStatus(reference);
  } catch {
    return redirect('/dashboard/billing', 'error', 'status_check_failed');
  }

  if (status !== 'success') {
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
