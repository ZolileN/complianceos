import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { activateSubscription } from '@/lib/billing/service';
import { getExpressPaymentStatus } from '@/lib/billing/providers/stitch';
import { isTenantPlan } from '@/lib/plans';

/**
 * Stitch Express browser redirect after checkout.
 * Query: payment_id + reference (our merchantReference).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get('payment_id') || searchParams.get('id');
  const reference =
    searchParams.get('reference') || searchParams.get('merchantReference');

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  const redirect = (billing: string, reason?: string) => {
    const dest = new URL(`${appUrl}/dashboard/billing`);
    dest.searchParams.set('billing', billing);
    if (reason) dest.searchParams.set('reason', reason);
    return NextResponse.redirect(dest);
  };

  if (!paymentId || !reference) {
    return redirect('error', 'missing_payment');
  }

  const sub = await prisma.subscription.findFirst({
    where: { providerSubscriptionId: reference },
  });
  if (!sub) {
    return redirect('error', 'unknown_reference');
  }

  let status: string | null;
  try {
    status = await getExpressPaymentStatus(paymentId, reference);
  } catch {
    return redirect('error', 'status_check_failed');
  }

  if (status !== 'PAID') {
    return redirect('error', status === null ? 'payment_not_found' : 'not_paid');
  }

  const plan = isTenantPlan(sub.plan) ? sub.plan : 'starter';
  await activateSubscription(sub.tenantId, {
    plan,
    providerSubscriptionId: reference,
    providerPlanId: sub.providerPlanId || undefined,
  });

  return redirect('success');
}
