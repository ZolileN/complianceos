/**
 * CIPC registry provider abstraction.
 * Submissions remain manual — read-only company profile lookups.
 */

export type CipcProviderMode = 'ocr' | 'direct' | 'aggregator';

export type CompanyProfile = {
  enterpriseNumber: string;
  companyName: string;
  registrationDate?: string;
  status?: string;
  financialYearEnd?: string;
  taxNumber?: string;
  source: CipcProviderMode;
};

export type BoStatus = {
  enterpriseNumber: string;
  filed: boolean;
  lastFiledDate?: string;
  source: CipcProviderMode;
};

export interface CipcRegistryProvider {
  getCompanyProfile(enterpriseNumber: string): Promise<CompanyProfile | null>;
  getBeneficialOwnershipStatus(enterpriseNumber: string): Promise<BoStatus | null>;
}

export function getCipcProviderMode(): CipcProviderMode {
  const raw = (process.env.CIPC_PROVIDER || 'ocr').toLowerCase();
  if (raw === 'direct' || raw === 'aggregator') return raw;
  return 'ocr';
}
