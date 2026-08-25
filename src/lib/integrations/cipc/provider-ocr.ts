import type { BoStatus, CipcRegistryProvider, CompanyProfile } from './types';

/**
 * Fallback provider — uses approved COR14.3 OCR metadata from the document vault.
 * No external network calls.
 */
export class CipcOcrProvider implements CipcRegistryProvider {
  constructor(
    private readonly loadCorMetadata: (
      enterpriseNumber: string
    ) => Promise<Record<string, string> | null>
  ) {}

  async getCompanyProfile(enterpriseNumber: string): Promise<CompanyProfile | null> {
    const meta = await this.loadCorMetadata(enterpriseNumber);
    if (!meta) return null;

    return {
      enterpriseNumber,
      companyName: meta.company_name || meta.enterprise_name || 'Unknown',
      registrationDate: meta.registration_date,
      status: meta.enterprise_status || meta.status,
      financialYearEnd: meta.financial_year_end,
      taxNumber: meta.tax_number,
      source: 'ocr',
    };
  }

  async getBeneficialOwnershipStatus(enterpriseNumber: string): Promise<BoStatus | null> {
    const meta = await this.loadCorMetadata(enterpriseNumber);
    if (!meta) return null;

    return {
      enterpriseNumber,
      filed: meta.bo_filed === 'true' || meta.beneficial_ownership_filed === 'true',
      lastFiledDate: meta.bo_last_filed_date,
      source: 'ocr',
    };
  }
}
