import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { activateSubscription } from '@/lib/billing/service';
import {
  getExpressPaymentStatus,
  verifyExpressSignature,
} from '@/lib/billing/providers/stitch';
import { isTenantPlan } from '@/lib/plans';

/**
 * Stitch Express server-to-server payment confirmation.
 * Signature scheme matches the official Stitch Express WooCommerce plugin.
 */
export async function POST(request: NextRequest) {
  const clientSecret = (process.env.STITCH_CLIENT_SECRET || '').trim();
  const signature = request.headers.get('x-stitch-express-signature');
  const rawBody = await request.text();

  if (!signature || !clientSecret) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!verifyExpressSignature(rawBody, signature, clientSecret)) {
    return NextResponse.json(
      { success: false, error: 'Invalid signature' },
      { status: 401 }
    );
  }

  let body: { payment_id?: string; reference?: string };
  try {
    body = JSON.parse(rawBody) as { payment_id?: string; reference?: string };
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
  if (!body.payment_id || !body.reference) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const sub = await prisma.subscription.findFirst({
    where: { providerSubscriptionId: body.reference },
  });
  if (!sub) {
    return NextResponse.json(
      { success: false, error: 'Unknown reference' },
      { status: 404 }
    );
  }

  // Confirm with Stitch before activating — never trust the payload alone.
  const status = await getExpressPaymentStatus(body.payment_id, body.reference);
  if (status !== 'PAID') {
    return NextResponse.json({ success: true, skipped: `status=${status}` });
  }

  const plan = isTenantPlan(sub.plan) ? sub.plan : 'starter';
  await activateSubscription(sub.tenantId, {
    plan,
    providerSubscriptionId: body.reference,
    providerPlanId: sub.providerPlanId || undefined,
  });

  return NextResponse.json({ success: true });
}
