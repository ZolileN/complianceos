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

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/json',
    };
  }

  async getCompanyProfile(enterpriseNumber: string): Promise<CompanyProfile | null> {
    if (!this.configured()) return null;

    try {
      const res = await fetch(
        `${this.baseUrl}/company/${encodeURIComponent(enterpriseNumber)}`,
        { headers: this.headers() }
      );
      if (!res.ok) return null;
      const data = (await res.json()) as Record<string, string>;
      return {
        enterpriseNumber,
        companyName: data.companyName || data.name || data.enterpriseName || 'Unknown',
        registrationDate: data.registrationDate || data.incorporationDate,
        status: data.status || data.companyStatus,
        financialYearEnd: data.financialYearEnd || data.financial_year_end,
        taxNumber: data.taxNumber || data.incomeTaxNumber,
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
        { headers: this.headers() }
      );
      if (!res.ok) return null;
      const data = (await res.json()) as Record<string, string | boolean>;
      return {
        enterpriseNumber,
        filed: Boolean(data.filed ?? data.boFiled ?? data.beneficialOwnershipFiled),
        lastFiledDate:
          typeof data.lastFiledDate === 'string'
            ? data.lastFiledDate
            : typeof data.last_filed_date === 'string'
              ? data.last_filed_date
              : undefined,
        source: 'aggregator',
      };
    } catch {
      return null;
    }
  }
}
