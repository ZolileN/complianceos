/**
 * Pay-before-create signup checkout for Growth / Professional plans.
 */

import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getBillingProvider } from '@/lib/billing/provider';
import {
  getPlanDefinition,
  isTenantPlan,
  type TenantPlan,
} from '@/lib/plans';
import { createTenantWithAdmin } from '@/lib/tenant-provision';
import { buildOzowHash, ozowReturnUrl } from '@/lib/billing/providers/ozow';
import { createPaystackPayment } from '@/lib/billing/providers/paystack';

const PENDING_TTL_MS = 24 * 60 * 60 * 1000;

function requireOzowEnv() {
  const siteCode = process.env.OZOW_SITE_CODE || '';
  const privateKey = process.env.OZOW_PRIVATE_KEY || '';
  const apiKey = process.env.OZOW_API_KEY || '';
  if (!siteCode || !privateKey || !apiKey) {
    throw new Error('Ozow credentials missing (OZOW_SITE_CODE / OZOW_PRIVATE_KEY / OZOW_API_KEY)');
  }
  return { siteCode, privateKey, apiKey };
}

export type SignupCheckoutInput = {
  firmName: string;
  fullName: string;
  email: string;
  password: string;
  plan: TenantPlan;
};

export async function createPendingSignupCheckout(input: SignupCheckoutInput) {
  if (!isTenantPlan(input.plan)) throw new Error('Invalid plan');
  if (input.plan === 'starter' || input.plan === 'enterprise') {
    throw new Error('This plan does not require pre-payment checkout');
  }

  const def = getPlanDefinition(input.plan);
  if (def.priceZarCents == null) {
    throw new Error('Plan requires contacting sales');
  }

  const normalizedEmail = input.email.toLowerCase().trim();
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existingUser) {
    throw new Error('User already exists with this email');
  }

  const passwordHash = await bcrypt.hash(input.password, 10);
  const expiresAt = new Date(Date.now() + PENDING_TTL_MS);
  const transactionReference = `PRAXIS-SIGNUP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const provider = getBillingProvider();

  if (provider.id === 'manual') {
    const pending = await prisma.pendingSignup.create({
      data: {
        plan: input.plan,
        firmName: input.firmName.trim(),
        fullName: input.fullName.trim(),
        email: normalizedEmail,
        passwordHash,
        status: 'paid',
        paymentReference: transactionReference,
        provider: 'manual',
        expiresAt,
      },
    });
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
    return {
      pendingSignupId: pending.id,
      checkoutUrl: `${appUrl}/signup?plan=${input.plan}&pending=${pending.id}&billing=success`,
      provider: 'manual' as const,
    };
  }

  if (provider.id === 'paystack') {
    const pending = await prisma.pendingSignup.create({
      data: {
        plan: input.plan,
        firmName: input.firmName.trim(),
        fullName: input.fullName.trim(),
        email: normalizedEmail,
        passwordHash,
        status: 'pending',
        paymentReference: transactionReference,
        provider: 'paystack',
        expiresAt,
      },
    });

    const payment = await createPaystackPayment({
      amountCents: def.priceZarCents,
      email: normalizedEmail,
      payerName: input.firmName.trim(),
      merchantReference: transactionReference,
      metadata: { pending_signup_id: pending.id, plan: input.plan },
    });

    await prisma.pendingSignup.update({
      where: { id: pending.id },
      data: { paymentPayload: JSON.stringify({ reference: payment.reference }) },
    });

    return {
      pendingSignupId: pending.id,
      checkoutUrl: payment.checkoutUrl,
      provider: 'paystack' as const,
    };
  }

  if (provider.id !== 'ozow') {
    throw new Error(
      'Signup checkout currently supports Paystack, Ozow, or manual billing. Configure PAYSTACK_SECRET_KEY / OZOW_* or BILLING_PROVIDER=manual for development.'
    );
  }

  const { siteCode, privateKey } = requireOzowEnv();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  const amount = (def.priceZarCents / 100).toFixed(2);
  const bankReference = `Praxis ${def.name}`.slice(0, 20);
  const isTest = (process.env.OZOW_IS_TEST || '').toLowerCase() === 'true';
  const countryCode = 'ZA';
  const currencyCode = 'ZAR';

  const pending = await prisma.pendingSignup.create({
    data: {
      plan: input.plan,
      firmName: input.firmName.trim(),
      fullName: input.fullName.trim(),
      email: normalizedEmail,
      passwordHash,
      status: 'pending',
      paymentReference: transactionReference,
      provider: 'ozow',
      expiresAt,
    },
  });

  // Short return URLs — Ozow CancelUrl max length is 50.
  const cancelUrl = ozowReturnUrl('c', { plan: input.plan });
  const errorUrl = ozowReturnUrl('e', { plan: input.plan });
  const successUrl = ozowReturnUrl('s', {
    plan: input.plan,
    pending: pending.id,
  });
  const notifyUrl = `${appUrl}/api/billing/ozow/webhook`;

  const hash = buildOzowHash(
    [
      siteCode,
      countryCode,
      currencyCode,
      amount,
      transactionReference,
      bankReference,
      cancelUrl,
      errorUrl,
      successUrl,
      notifyUrl,
      isTest ? 'true' : 'false',
    ],
    privateKey
  );

  const payload = {
    siteCode,
    countryCode,
    currencyCode,
    amount,
    transactionReference,
    bankReference,
    cancelUrl,
    errorUrl,
    successUrl,
    notifyUrl,
    isTest: isTest ? 'true' : 'false',
    hashCheck: hash,
  };

  await prisma.pendingSignup.update({
    where: { id: pending.id },
    data: { paymentPayload: JSON.stringify(payload) },
  });

  // Relative so local/preview uses this deployment's Ozow form, not production APP_URL.
  const checkoutUrl = `/api/billing/ozow/redirect?pendingId=${pending.id}&ref=${encodeURIComponent(transactionReference)}`;

  return {
    pendingSignupId: pending.id,
    checkoutUrl,
    provider: 'ozow' as const,
  };
}

export async function markPendingSignupPaid(paymentReference: string) {
  const pending = await prisma.pendingSignup.findUnique({
    where: { paymentReference },
  });
  if (!pending || pending.status === 'completed') return pending;
  if (pending.status === 'expired' || pending.expiresAt < new Date()) {
    await prisma.pendingSignup.update({
      where: { id: pending.id },
      data: { status: 'expired' },
    });
    return null;
  }
  return prisma.pendingSignup.update({
    where: { id: pending.id },
    data: { status: 'paid' },
  });
}

export async function completePendingSignup(pendingSignupId: string) {
  const pending = await prisma.pendingSignup.findUnique({
    where: { id: pendingSignupId },
  });
  if (!pending) throw new Error('Signup session not found');
  if (pending.status === 'completed') {
    throw new Error('Signup already completed');
  }
  if (pending.status !== 'paid') {
    throw new Error('Payment required before creating your workspace');
  }
  if (pending.expiresAt < new Date()) {
    await prisma.pendingSignup.update({
      where: { id: pending.id },
      data: { status: 'expired' },
    });
    throw new Error('Signup session expired — please start again');
  }
  return pending;
}

export type CompletePaidSignupResult = {
  outcome: 'created' | 'already_completed' | 'already_exists';
  email: string;
  tenantSlug?: string;
};

export function signupCompleteLoginUrl(email: string, appUrl?: string): string {
  const base = (appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
  const dest = new URL(`${base}/login`);
  dest.searchParams.set('registered', '1');
  dest.searchParams.set('email', email);
  return dest.toString();
}

/**
 * Idempotently provision a tenant after payment. Uses the password hash captured
 * at checkout time so the customer can sign in immediately.
 */
export async function completePaidPendingSignup(
  paymentReference: string
): Promise<CompletePaidSignupResult> {
  const pending = await prisma.pendingSignup.findUnique({
    where: { paymentReference },
  });
  if (!pending) {
    throw new Error('Signup session not found');
  }

  if (pending.expiresAt < new Date()) {
    await prisma.pendingSignup.update({
      where: { id: pending.id },
      data: { status: 'expired' },
    });
    throw new Error('Signup session expired — please start again');
  }

  if (pending.status === 'completed') {
    return { outcome: 'already_completed', email: pending.email };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: pending.email },
  });
  if (existingUser) {
    await prisma.pendingSignup.update({
      where: { id: pending.id },
      data: { status: 'completed' },
    });
    return { outcome: 'already_exists', email: pending.email };
  }

  if (pending.status !== 'paid') {
    throw new Error('Payment required before creating your workspace');
  }

  const plan = isTenantPlan(pending.plan) ? pending.plan : 'growth';
  const result = await createTenantWithAdmin({
    firmName: pending.firmName,
    fullName: pending.fullName,
    email: pending.email,
    passwordHash: pending.passwordHash,
    plan,
    startActive: true,
    billingProvider: pending.provider || 'manual',
    providerSubscriptionId: pending.paymentReference,
  });

  await prisma.pendingSignup.update({
    where: { id: pending.id },
    data: { status: 'completed' },
  });

  return {
    outcome: 'created',
    email: pending.email,
    tenantSlug: result.tenant.slug,
  };
}

export async function completePaidPendingSignupById(
  pendingSignupId: string
): Promise<CompletePaidSignupResult> {
  const pending = await prisma.pendingSignup.findUnique({
    where: { id: pendingSignupId },
  });
  if (!pending) {
    throw new Error('Signup session not found');
  }
  return completePaidPendingSignup(pending.paymentReference);
}
