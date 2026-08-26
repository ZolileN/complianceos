/**
 * Resolve the email Paystack (and renewal notices) should use for a tenant.
 *
 * `Tenant.email` is the firm's billing/contact address in company settings.
 * Many workspaces were provisioned with only a User login email, so we fall
 * back to an active administrator (then any active user) when it is unset.
 */

import { prisma } from '@/lib/prisma';

function normalizeEmail(value: string | null | undefined): string | null {
  const email = (value || '').trim().toLowerCase();
  return email || null;
}

export async function resolveTenantBillingEmail(
  tenantId: string,
  opts: { backfill?: boolean } = {}
): Promise<string> {
  const backfill = opts.backfill ?? true;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { email: true },
  });
  if (!tenant) throw new Error('Tenant not found');

  const tenantEmail = normalizeEmail(tenant.email);
  if (tenantEmail) return tenantEmail;

  const admin = await prisma.user.findFirst({
    where: {
      tenantId,
      isActive: true,
      role: 'administrator',
      email: { not: null },
    },
    orderBy: { createdAt: 'asc' },
    select: { email: true },
  });
  const adminEmail = normalizeEmail(admin?.email);
  if (adminEmail) {
    if (backfill) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { email: adminEmail },
      });
    }
    return adminEmail;
  }

  const anyUser = await prisma.user.findFirst({
    where: {
      tenantId,
      isActive: true,
      email: { not: null },
    },
    orderBy: { createdAt: 'asc' },
    select: { email: true },
  });
  const userEmail = normalizeEmail(anyUser?.email);
  if (userEmail) {
    if (backfill) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { email: userEmail },
      });
    }
    return userEmail;
  }

  throw new Error(
    'No billing email found for this workspace. Add a business email under Settings → Company, or ensure an administrator account has an email address.'
  );
}
