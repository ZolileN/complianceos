import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { activateSubscription } from '@/lib/billing/service';
import { isTenantPlan } from '@/lib/plans';

/**
 * Stitch redirect callback after subscription collection approval.
 * Query: collection_id | id, tenant hint via state if present.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const collectionId =
    searchParams.get('id') ||
    searchParams.get('collection_id') ||
    searchParams.get('subscriptionCollectionId');

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');

  if (!collectionId) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?billing=error&reason=missing_collection`
    );
  }

  const sub = await prisma.subscription.findFirst({
    where: { providerSubscriptionId: collectionId },
  });

  if (!sub) {
    return NextResponse.redirect(
      `${appUrl}/dashboard/settings?billing=error&reason=unknown_collection`
    );
  }

  const plan = isTenantPlan(sub.plan) ? sub.plan : 'starter';
  await activateSubscription(sub.tenantId, {
    plan,
    providerSubscriptionId: collectionId,
    providerPlanId: sub.providerPlanId || undefined,
  });

  return NextResponse.redirect(`${appUrl}/dashboard/settings?billing=success`);
}
