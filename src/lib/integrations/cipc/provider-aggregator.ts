import type { BoStatus, CipcRegistryProvider, CompanyProfile } from './types';

/**
 * Commercial aggregator provider — env-driven REST endpoint.
 * Activated when CIPC_PROVIDER=aggregator.
 */
export class CipcAggregatorProvider implements CipcRegistryProvider {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = process.env.CIPC_AGGREGATOR_BASE_URL || '';
    this.apiKey = process.env.CIPC_AGGREGATOR_API_KEY || '';
  }

  private configured(): boolean {
    return Boolean(this.baseUrl && this.apiKey);
  }

  async getCompanyProfile(enterpriseNumber: string): Promise<CompanyProfile | null> {
    if (!this.configured()) return null;

    try {
      const res = await fetch(
        `${this.baseUrl}/company/${encodeURIComponent(enterpriseNumber)}`,
        { headers: { Authorization: `Bearer ${this.apiKey}` } }
      );
      if (!res.ok) return null;
      const data = (await res.json()) as Record<string, string>;
      return {
        enterpriseNumber,
        companyName: data.companyName || data.name || 'Unknown',
        registrationDate: data.registrationDate,
        status: data.status,
        financialYearEnd: data.financialYearEnd,
        taxNumber: data.taxNumber,
        source: 'aggregator',
      };
    } catch {
      return null;
    }
  }

  async getBeneficialOwnershipStatus(enterpriseNumber: string): Promise<BoStatus | null> {
    if (!this.configured()) return null;

    try {
      const res = await fetch(
        `${this.baseUrl}/company/${encodeURIComponent(enterpriseNumber)}/bo`,
        { headers: { Authorization: `Bearer ${this.apiKey}` } }
      );
      if (!res.ok) return null;
      const data = (await res.json()) as Record<string, string | boolean>;
      return {
        enterpriseNumber,
        filed: Boolean(data.filed),
        lastFiledDate: typeof data.lastFiledDate === 'string' ? data.lastFiledDate : undefined,
        source: 'aggregator',
      };
    } catch {
      return null;
    }
  }
}
