import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { activateSubscription } from '@/lib/billing/service';
import {
  getPaystackTransactionStatus,
  requirePaystackSecretKey,
  verifyPaystackSignature,
} from '@/lib/billing/providers/paystack';
import { markPendingSignupPaid } from '@/lib/signup-checkout';
import { isTenantPlan } from '@/lib/plans';

/**
 * Paystack server-to-server payment confirmation (charge.success).
 */
export async function POST(request: NextRequest) {
  const secretKey = requirePaystackSecretKey();
  const signature = request.headers.get('x-paystack-signature');
  const rawBody = await request.text();

  if (!signature) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!verifyPaystackSignature(rawBody, signature, secretKey)) {
    return NextResponse.json(
      { success: false, error: 'Invalid signature' },
      { status: 401 }
    );
  }

  let body: { event?: string; data?: { reference?: string } };
  try {
    body = JSON.parse(rawBody) as { event?: string; data?: { reference?: string } };
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  if (body.event !== 'charge.success' || !body.data?.reference) {
    return NextResponse.json({ success: true, skipped: body.event ?? 'no_event' });
  }

  const reference = body.data.reference;

  // Confirm with Paystack before acting — never trust the payload alone.
  const status = await getPaystackTransactionStatus(reference);
  if (status !== 'success') {
    return NextResponse.json({ success: true, skipped: `status=${status}` });
  }

  const pendingSignup = await prisma.pendingSignup.findUnique({
    where: { paymentReference: reference },
  });
  if (pendingSignup) {
    await markPendingSignupPaid(reference);
    return NextResponse.json({ success: true, signup: pendingSignup.id });
  }

  const sub = await prisma.subscription.findFirst({
    where: { providerSubscriptionId: reference },
  });
  if (!sub) {
    return NextResponse.json(
      { success: false, error: 'Unknown reference' },
      { status: 404 }
    );
  }

  const plan = isTenantPlan(sub.plan) ? sub.plan : 'starter';
  await activateSubscription(sub.tenantId, {
    plan,
    providerSubscriptionId: reference,
    providerPlanId: sub.providerPlanId || undefined,
  });

  return NextResponse.json({ success: true });
}
