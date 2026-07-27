/**
 * Shared tenant + admin-user provisioning used by public signup and PraxisAdmin.
 */

import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import {
  DEFAULT_SIGNUP_PLAN,
  isTenantPlan,
  type TenantPlan,
} from '@/lib/plans';
import { createTrialSubscriptionData } from '@/lib/entitlements';
import { addOneMonth } from '@/lib/billing/dates';

export {
  TENANT_PLANS,
  isTenantPlan,
  type TenantPlan,
} from '@/lib/plans';

export function slugifyFirmName(firmName: string): string {
  return firmName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export type CreateTenantInput = {
  firmName: string;
  fullName: string;
  email: string;
  /** Plain password — hashed before storage. Omit when passwordHash is set. */
  password?: string;
  /** Pre-hashed password (e.g. from a paid pending signup session). */
  passwordHash?: string;
  plan?: TenantPlan;
  settings?: Record<string, unknown>;
  /** Skip trial (e.g. admin-provisioned paid workspace) */
  startActive?: boolean;
  billingProvider?: string;
  providerSubscriptionId?: string | null;
};

export type CreateTenantResult = {
  tenant: { id: string; name: string; slug: string; plan: string };
  user: { id: string; email: string | null; name: string | null };
};

export async function createTenantWithAdmin(
  input: CreateTenantInput
): Promise<CreateTenantResult> {
  const { firmName, fullName, email } = input;
  const plan: TenantPlan =
    input.plan && isTenantPlan(input.plan) ? input.plan : DEFAULT_SIGNUP_PLAN;
  const settings = JSON.stringify(input.settings ?? {});

  if (!input.password && !input.passwordHash) {
    throw new Error('Password is required');
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('User already exists with this email');
  }

  const slug = slugifyFirmName(firmName);
  if (!slug) {
    throw new Error('Invalid firm name');
  }

  const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
  if (existingTenant) {
    throw new Error('A firm with this name already exists');
  }

  const hashedPassword = input.passwordHash
    ? input.passwordHash
    : await bcrypt.hash(input.password!, 10);
  const trial = createTrialSubscriptionData(plan);
  const now = new Date();
  const subscriptionData = input.startActive
    ? {
        plan,
        status: 'active' as const,
        trialStartsAt: null,
        trialEndsAt: null,
        currentPeriodStart: now,
        // Paid signup starts a one-month billable period (month-to-month).
        currentPeriodEnd: addOneMonth(now),
        provider: input.billingProvider ?? 'manual',
        providerSubscriptionId: input.providerSubscriptionId ?? null,
      }
    : trial;

  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: firmName,
        slug,
        plan,
        settings,
        subscription: {
          create: subscriptionData,
        },
      },
      select: { id: true, name: true, slug: true, plan: true },
    });

    const user = await tx.user.create({
      data: {
        email,
        name: fullName,
        password: hashedPassword,
        role: 'administrator',
        tenantId: tenant.id,
        isActive: true,
      },
      select: { id: true, email: true, name: true },
    });

    return { tenant, user };
  });
}
