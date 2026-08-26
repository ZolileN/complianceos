import type { BoStatus, CipcRegistryProvider, CompanyProfile } from './types';
import { getCipcOAuthToken } from './oauth';

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

  private async authHeaders(): Promise<Record<string, string> | null> {
    if (!this.configured()) return null;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': this.subscriptionKey,
    };

    const token = await getCipcOAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  async getCompanyProfile(enterpriseNumber: string): Promise<CompanyProfile | null> {
    const headers = await this.authHeaders();
    if (!headers) return null;

    try {
      const res = await fetch(`${this.baseUrl}/enterprise/v1/companyprofile`, {
        method: 'POST',
        headers,
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
    const headers = await this.authHeaders();
    if (!headers) return null;

    try {
      const encoded = encodeURIComponent(enterpriseNumber);
      const res = await fetch(
        `${this.baseUrl}/sandbox/boreg/enterprise/register/${encoded}`,
        { headers }
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
