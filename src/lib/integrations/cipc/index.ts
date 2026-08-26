import { prisma } from '@/lib/prisma';
import { CipcAggregatorProvider } from './provider-aggregator';
import { CipcDirectProvider } from './provider-direct';
import { CipcOcrProvider } from './provider-ocr';
import type { CipcProviderMode, CipcRegistryProvider } from './types';
import { getCipcProviderMode } from './types';

async function loadCorMetadataFromVault(
  tenantId: string,
  enterpriseNumber: string
): Promise<Record<string, string> | null> {
  const normalized = enterpriseNumber.replace(/\s+/g, ' ').trim();
  const docs = await prisma.document.findMany({
    where: {
      tenantId,
      category: 'cor_document',
      ocrStatus: 'completed',
    },
    orderBy: { updatedAt: 'desc' },
    take: 20,
    select: { ocrMetadata: true },
  });

  for (const doc of docs) {
    if (!doc.ocrMetadata) continue;
    try {
      const meta = JSON.parse(doc.ocrMetadata) as Record<string, string>;
      const reg = (meta.registration_number || '').replace(/\s+/g, ' ').trim();
      if (reg && reg === normalized) return meta;
    } catch {
      continue;
    }
  }
  return null;
}

export function createCipcProvider(
  mode: CipcProviderMode,
  tenantId?: string
): CipcRegistryProvider {
  if (mode === 'direct') return new CipcDirectProvider();
  if (mode === 'aggregator') return new CipcAggregatorProvider();

  return new CipcOcrProvider(async (enterpriseNumber) => {
    if (!tenantId) return null;
    return loadCorMetadataFromVault(tenantId, enterpriseNumber);
  });
}

/** Provider fallback chain: configured mode → OCR vault. */
export async function lookupCompanyProfile(
  tenantId: string,
  enterpriseNumber: string,
  modeOverride?: CipcProviderMode
) {
  const mode = modeOverride ?? getCipcProviderMode();
  const primary = createCipcProvider(mode, tenantId);
  const profile = await primary.getCompanyProfile(enterpriseNumber);
  if (profile) return profile;

  if (mode !== 'ocr') {
    const ocr = createCipcProvider('ocr', tenantId);
    return ocr.getCompanyProfile(enterpriseNumber);
  }

  return null;
}

export { getCipcProviderMode };
