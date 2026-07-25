/**
 * Shared tenant + admin-user provisioning used by public signup and PraxisAdmin.
 */

import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const TENANT_PLANS = [
  'starter',
  'growth',
  'professional',
  'enterprise',
] as const;

export type TenantPlan = (typeof TENANT_PLANS)[number];

export function isTenantPlan(value: string): value is TenantPlan {
  return (TENANT_PLANS as readonly string[]).includes(value);
}

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
  password: string;
  plan?: TenantPlan;
  settings?: Record<string, unknown>;
};

export type CreateTenantResult = {
  tenant: { id: string; name: string; slug: string; plan: string };
  user: { id: string; email: string | null; name: string | null };
};

export async function createTenantWithAdmin(
  input: CreateTenantInput
): Promise<CreateTenantResult> {
  const { firmName, fullName, email, password } = input;
  const plan = input.plan ?? 'starter';
  const settings = JSON.stringify(input.settings ?? {});

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

  const hashedPassword = await bcrypt.hash(password, 10);

  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: firmName,
        slug,
        plan,
        settings,
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
