import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { activateSubscription } from '@/lib/billing/service';
import { isTenantPlan } from '@/lib/plans';
import {
  completePaidPendingSignup,
  markPendingSignupPaid,
} from '@/lib/signup-checkout';

/**
 * Ozow notify/webhook — verify hash then activate subscription on success.
 */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const get = (k: string) => String(form.get(k) || '');

    const siteCode = get('SiteCode');
    const transactionId = get('TransactionId');
    const transactionReference = get('TransactionReference');
    const amount = get('Amount');
    const status = get('Status');
    const optional1 = get('Optional1');
    const optional2 = get('Optional2');
    const optional3 = get('Optional3');
    const optional4 = get('Optional4');
    const optional5 = get('Optional5');
    const currencyCode = get('CurrencyCode');
    const isTest = get('IsTest');
    const statusMessage = get('StatusMessage');
    const hashCheck = get('HashCheck');

    const privateKey = process.env.OZOW_PRIVATE_KEY || '';
    if (!privateKey) {
      return NextResponse.json({ error: 'Ozow not configured' }, { status: 500 });
    }

    // Ozow: concatenate fields + private key, lowercase, then SHA512.
    const expected = createHash('sha512')
      .update(
        [
          siteCode,
          transactionId,
          transactionReference,
          amount,
          status,
          optional1,
          optional2,
          optional3,
          optional4,
          optional5,
          currencyCode,
          isTest,
          statusMessage,
          privateKey,
        ]
          .join('')
          .toLowerCase(),
        'utf8'
      )
      .digest('hex');

    if (expected !== hashCheck.toLowerCase()) {
      console.warn('[Ozow webhook] hash mismatch', transactionReference);
      return NextResponse.json({ error: 'Invalid hash' }, { status: 400 });
    }

    // Ozow success statuses commonly include Complete / CompletePendingSettlement
    const ok =
      status.toLowerCase().includes('complete') ||
      status === '1' ||
      status.toLowerCase() === 'complete';

    if (!ok) {
      return NextResponse.json({ received: true, activated: false, status });
    }

    const sub = await prisma.subscription.findFirst({
      where: { providerSubscriptionId: transactionReference },
    });

    if (sub) {
      const plan = isTenantPlan(sub.plan) ? sub.plan : 'starter';
      await activateSubscription(sub.tenantId, {
        plan,
        providerSubscriptionId: transactionReference,
        providerCustomerId: transactionId || undefined,
        providerPlanId: plan,
      });
      return NextResponse.json({ received: true, activated: true, type: 'tenant' });
    }

    const pending = await markPendingSignupPaid(transactionReference);
    if (pending) {
      try {
        await completePaidPendingSignup(transactionReference);
      } catch (err) {
        console.error('[Ozow webhook] signup finalize failed', err);
      }
      return NextResponse.json({ received: true, activated: true, type: 'signup' });
    }

    console.warn('[Ozow webhook] unknown reference', transactionReference);
    return NextResponse.json({ received: true, activated: false });
  } catch (error: unknown) {
    console.error('[Ozow webhook]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook failed' },
      { status: 500 }
    );
  }
}
