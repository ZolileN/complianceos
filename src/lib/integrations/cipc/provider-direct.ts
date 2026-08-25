import type { BoStatus, CipcRegistryProvider, CompanyProfile } from './types';

/**
 * Direct CIPC Azure APIM gateway provider.
 * Activated when CIPC_PROVIDER=direct and credentials are configured.
 */
export class CipcDirectProvider implements CipcRegistryProvider {
  private readonly baseUrl: string;
  private readonly subscriptionKey: string;

  constructor() {
    this.baseUrl = process.env.CIPC_API_BASE_URL || '';
    this.subscriptionKey = process.env.CIPC_SUBSCRIPTION_KEY || '';
  }

  private configured(): boolean {
    return Boolean(this.baseUrl && this.subscriptionKey);
  }

  async getCompanyProfile(enterpriseNumber: string): Promise<CompanyProfile | null> {
    if (!this.configured()) return null;

    try {
      const res = await fetch(`${this.baseUrl}/enterprise/v1/companyprofile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': this.subscriptionKey,
        },
        body: JSON.stringify({ enterpriseNumber }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as Record<string, string>;
      return {
        enterpriseNumber,
        companyName: data.companyName || data.enterpriseName || 'Unknown',
        registrationDate: data.registrationDate,
        status: data.status,
        financialYearEnd: data.financialYearEnd,
        taxNumber: data.taxNumber,
        source: 'direct',
      };
    } catch {
      return null;
    }
  }

  async getBeneficialOwnershipStatus(enterpriseNumber: string): Promise<BoStatus | null> {
    if (!this.configured()) return null;

    try {
      const encoded = encodeURIComponent(enterpriseNumber);
      const res = await fetch(
        `${this.baseUrl}/sandbox/boreg/enterprise/register/${encoded}`,
        {
          headers: { 'Ocp-Apim-Subscription-Key': this.subscriptionKey },
        }
      );
      if (!res.ok) return null;
      const data = (await res.json()) as Record<string, string | boolean>;
      return {
        enterpriseNumber,
        filed: Boolean(data.filed ?? data.boFiled),
        lastFiledDate: typeof data.lastFiledDate === 'string' ? data.lastFiledDate : undefined,
        source: 'direct',
      };
    } catch {
      return null;
    }
  }
}
