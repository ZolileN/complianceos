/**
 * Renewal dunning: before a paid period lapses, issue a fresh payment link
 * and email it to the tenant. Payment confirmation (webhook/callback) then
 * extends the subscription via activateSubscription.
 */

import { prisma } from '@/lib/prisma';
import { getPlanDefinition, isTenantPlan } from '@/lib/plans';
import { createPaystackPayment } from '@/lib/billing/providers/paystack';
import { paystackCheckoutAvailable } from '@/lib/billing/provider';
import { isPlatformAdminSlug } from '@/lib/platform-admin-constants';
import { sendRenewalEmail } from '@/lib/email';

/** Days before period end that the renewal notice goes out. */
export const RENEWAL_NOTICE_DAYS = 5;

export async function sendRenewalNotices(now = new Date()) {
  const windowEnd = new Date(
    now.getTime() + RENEWAL_NOTICE_DAYS * 24 * 60 * 60 * 1000
  );

  const due = await prisma.subscription.findMany({
    where: {
      status: 'active',
      cancelAtPeriodEnd: false,
      currentPeriodEnd: { gt: now, lte: windowEnd },
      // Once per period: cleared on activation, set when notice is sent.
      renewalNoticeAt: null,
    },
    include: {
      tenant: { select: { name: true, email: true, slug: true } },
    },
  });

  let sent = 0;
  let skipped = 0;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');

  for (const sub of due) {
    // Master control-plane tenants are internal — never billed.
    if (isPlatformAdminSlug(sub.tenant.slug)) {
      skipped += 1;
      continue;
    }

    const plan = isTenantPlan(sub.plan) ? sub.plan : null;
    const def = plan ? getPlanDefinition(plan) : null;
    const email = sub.tenant.email;

    if (!plan || !def || def.priceZarCents == null || !email) {
      skipped += 1;
      continue;
    }

    let payUrl = `${appUrl}/dashboard/billing`;

    // Prefer a direct Paystack checkout link (no login required).
    // Fall back to the billing dashboard when only Ozow/manual is available.
    if (paystackCheckoutAvailable()) {
      try {
        const reference = `PXRN-${sub.tenant.slug.slice(0, 24)}-${plan.slice(0, 4)}-${Date.now()}`
          .replace(/[^a-zA-Z0-9\-_.]/g, '')
          .slice(0, 64);
        const payment = await createPaystackPayment({
          amountCents: def.priceZarCents,
          email,
          payerName: sub.tenant.name,
          merchantReference: reference,
          metadata: { tenant_id: sub.tenantId, plan },
        });
        payUrl = payment.checkoutUrl;

        await prisma.subscription.update({
          where: { tenantId: sub.tenantId },
          data: {
            provider: 'paystack',
            providerSubscriptionId: reference,
          },
        });
      } catch (err) {
        console.warn(
          `[renewals] Paystack link failed for ${sub.tenantId}; using dashboard link`,
          err instanceof Error ? err.message : err
        );
      }
    }

    const result = await sendRenewalEmail(email, {
      firmName: sub.tenant.name,
      planName: def.name,
      amountZar: (def.priceZarCents / 100).toFixed(2),
      periodEnd: sub.currentPeriodEnd ?? windowEnd,
      payUrl,
    });

    if (result.success) {
      await prisma.subscription.update({
        where: { tenantId: sub.tenantId },
        data: { renewalNoticeAt: now },
      });
      sent += 1;
    } else {
      skipped += 1;
    }
  }

  return { renewalsSent: sent, renewalsSkipped: skipped, renewalsDue: due.length };
}
