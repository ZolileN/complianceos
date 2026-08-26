import { createCipcProvider, lookupCompanyProfile } from './index';
import { persistRegistrySnapshot } from './registry-snapshot';
import type { CipcProviderMode } from './types';
import {
  annualReturnsStatusForDueDate,
  computeAnnualReturnsDueDate,
} from '@/lib/cipc-due-dates';
import { resolveObligation } from '@/lib/compliance-catalog';
import { prisma } from '@/lib/prisma';
import {
  emitComplianceStatusChanged,
  notifyComplianceStakeholders,
} from '@/lib/compliance-monitor';

export type CipcSyncResult = {
  clientId: string;
  success: boolean;
  provider?: CipcProviderMode;
  error?: string;
};

export async function syncClientRegistry(
  tenantId: string,
  clientId: string,
  mode?: CipcProviderMode
): Promise<CipcSyncResult> {
  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId },
    select: {
      id: true,
      companyName: true,
      registrationNumber: true,
      taxNumber: true,
      assignedConsultantId: true,
    },
  });

  if (!client) {
    return { clientId, success: false, error: 'Client not found' };
  }

  const enterpriseNumber = client.registrationNumber?.trim();
  if (!enterpriseNumber) {
    return { clientId, success: false, error: 'Registration number required' };
  }

  try {
    const profile = await lookupCompanyProfile(tenantId, enterpriseNumber, mode);
    if (!profile) {
      await persistRegistrySnapshot({
        tenantId,
        clientId,
        enterpriseNumber,
        profile: {
          enterpriseNumber,
          companyName: client.companyName,
          source: mode || 'ocr',
        },
        lastError: 'No registry data found',
      });
      return { clientId, success: false, error: 'No registry data found' };
    }

    const provider = createCipcProvider(profile.source, tenantId);
    const boStatus = await provider.getBeneficialOwnershipStatus(enterpriseNumber);

    await persistRegistrySnapshot({
      tenantId,
      clientId,
      enterpriseNumber,
      profile,
      boStatus,
    });

    const clientUpdate: Record<string, string> = {};
    if (profile.companyName && profile.companyName !== 'Unknown' && profile.companyName !== client.companyName) {
      clientUpdate.companyName = profile.companyName;
    }
    if (profile.taxNumber && !client.taxNumber) {
      clientUpdate.taxNumber = profile.taxNumber;
    }
    if (Object.keys(clientUpdate).length > 0) {
      await prisma.client.update({ where: { id: clientId }, data: clientUpdate });
    }

    if (profile.registrationDate) {
      const dueDate = computeAnnualReturnsDueDate(profile.registrationDate);
      if (dueDate) {
        const resolved = resolveObligation('CIPC', 'Annual Returns');
        const status = annualReturnsStatusForDueDate(dueDate);
        const existing = await prisma.complianceItem.findUnique({
          where: {
            clientId_category_name: {
              clientId,
              category: resolved.category,
              name: resolved.name,
            },
          },
        });
        const previousStatus = existing?.status ?? null;

        const complianceItem = await prisma.complianceItem.upsert({
          where: {
            clientId_category_name: {
              clientId,
              category: resolved.category,
              name: resolved.name,
            },
          },
          update: {
            dueDate,
            status,
            lastChecked: new Date(),
            notes:
              (existing?.notes ? `${existing.notes}\n\n` : '') +
              `Annual returns due date updated from CIPC registry sync (${profile.source}).`,
          },
          create: {
            clientId,
            tenantId,
            category: resolved.category,
            name: resolved.name,
            status,
            dueDate,
            lastChecked: new Date(),
            notes: `Set from CIPC registry sync (${profile.source}).`,
          },
        });

        if (previousStatus !== complianceItem.status) {
          await emitComplianceStatusChanged(
            {
              id: complianceItem.id,
              clientId: complianceItem.clientId,
              tenantId: complianceItem.tenantId,
              category: complianceItem.category,
              name: complianceItem.name,
              status: complianceItem.status,
              dueDate: complianceItem.dueDate,
            },
            previousStatus
          );
          await notifyComplianceStakeholders(
            {
              id: complianceItem.id,
              clientId: complianceItem.clientId,
              tenantId: complianceItem.tenantId,
              category: complianceItem.category,
              name: complianceItem.name,
              status: complianceItem.status,
              dueDate: complianceItem.dueDate,
            },
            {
              title: 'CIPC annual returns updated',
              message: `${client.companyName} — due ${dueDate.toLocaleDateString('en-ZA')} (registry sync).`,
              type: status === 'critical' ? 'error' : status === 'action_required' ? 'warning' : 'success',
              dedupeKey: 'cipc-registry-sync',
            },
            client.assignedConsultantId
          );
        }
      }
    }

    return { clientId, success: true, provider: profile.source };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    await persistRegistrySnapshot({
      tenantId,
      clientId,
      enterpriseNumber,
      profile: {
        enterpriseNumber,
        companyName: client.companyName,
        source: mode || 'ocr',
      },
      lastError: message,
    });
    return { clientId, success: false, error: message };
  }
}

export async function runCipcRegistrySyncForTenant(tenantId: string): Promise<{
  synced: number;
  failed: number;
  skipped: number;
  results: CipcSyncResult[];
}> {
  const clients = await prisma.client.findMany({
    where: {
      tenantId,
      registrationNumber: { not: null },
      NOT: { registrationNumber: '__INBOUND_QUEUE__' },
    },
    select: { id: true, registrationNumber: true },
  });

  const results: CipcSyncResult[] = [];
  let synced = 0;
  let failed = 0;
  let skipped = 0;

  for (const client of clients) {
    if (!client.registrationNumber?.trim()) {
      skipped++;
      continue;
    }
    const result = await syncClientRegistry(tenantId, client.id);
    results.push(result);
    if (result.success) synced++;
    else failed++;
  }

  return { synced, failed, skipped, results };
}

export async function runCipcRegistrySyncAllTenants(): Promise<{
  tenants: number;
  synced: number;
  failed: number;
}> {
  const mode = (process.env.CIPC_PROVIDER ?? '').toLowerCase();
  if (!mode || mode === 'ocr') {
    return { tenants: 0, synced: 0, failed: 0 };
  }

  const tenants = await prisma.tenant.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  let synced = 0;
  let failed = 0;

  for (const tenant of tenants) {
    const result = await runCipcRegistrySyncForTenant(tenant.id);
    synced += result.synced;
    failed += result.failed;
  }

  return { tenants: tenants.length, synced, failed };
}
