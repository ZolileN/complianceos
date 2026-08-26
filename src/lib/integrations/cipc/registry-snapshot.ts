import { createHash } from 'node:crypto';

import { prisma } from '@/lib/prisma';
import type { BoStatus, CompanyProfile } from './types';

export function hashDirectors(directors: unknown): string | null {
  if (!directors) return null;
  const payload = typeof directors === 'string' ? directors : JSON.stringify(directors);
  return createHash('sha256').update(payload).digest('hex');
}

export async function persistRegistrySnapshot(opts: {
  tenantId: string;
  clientId: string;
  enterpriseNumber: string;
  profile: CompanyProfile;
  boStatus?: BoStatus | null;
  directorsHash?: string | null;
  rawPayload?: Record<string, unknown> | null;
  lastError?: string | null;
}): Promise<void> {
  await prisma.clientRegistrySnapshot.upsert({
    where: { clientId: opts.clientId },
    update: {
      enterpriseNumber: opts.enterpriseNumber,
      companyName: opts.profile.companyName,
      status: opts.profile.status,
      registrationDate: opts.profile.registrationDate,
      financialYearEnd: opts.profile.financialYearEnd,
      taxNumber: opts.profile.taxNumber,
      boFiled: opts.boStatus?.filed ?? null,
      boLastFiledDate: opts.boStatus?.lastFiledDate ?? null,
      directorsHash: opts.directorsHash ?? null,
      provider: opts.profile.source,
      rawPayload: opts.rawPayload ? JSON.stringify(opts.rawPayload) : null,
      lastSyncedAt: new Date(),
      lastError: opts.lastError ?? null,
    },
    create: {
      tenantId: opts.tenantId,
      clientId: opts.clientId,
      enterpriseNumber: opts.enterpriseNumber,
      companyName: opts.profile.companyName,
      status: opts.profile.status,
      registrationDate: opts.profile.registrationDate,
      financialYearEnd: opts.profile.financialYearEnd,
      taxNumber: opts.profile.taxNumber,
      boFiled: opts.boStatus?.filed ?? null,
      boLastFiledDate: opts.boStatus?.lastFiledDate ?? null,
      directorsHash: opts.directorsHash ?? null,
      provider: opts.profile.source,
      rawPayload: opts.rawPayload ? JSON.stringify(opts.rawPayload) : null,
      lastError: opts.lastError ?? null,
    },
  });
}

export async function getRegistrySnapshot(clientId: string) {
  return prisma.clientRegistrySnapshot.findUnique({ where: { clientId } });
}
