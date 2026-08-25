import { describe, expect, it } from 'vitest';

import {
  classifySarsDocument,
  extractTaxIdentifiers,
  isLikelySarsInbound,
  isSarsEmailAddress,
  parseSarsDocumentFields,
} from '@/lib/sars-document-parsers';

describe('classifySarsDocument', () => {
  it('detects ITA34 assessments', () => {
    const result = classifySarsDocument('ITA34 Notice of Assessment for tax year 2025');
    expect(result?.kind).toBe('ita34');
    expect(result?.category).toBe('sars_assessment');
  });

  it('detects VAT201 confirmations', () => {
    const result = classifySarsDocument('VAT201 return submitted successfully. Reference: VAT-123');
    expect(result?.kind).toBe('vat201_confirmation');
    expect(result?.category).toBe('sars_submission');
  });

  it('detects SARS letters', () => {
    const result = classifySarsDocument(
      'South African Revenue Service\nAudit notification\nReference No: AUD-99'
    );
    expect(result?.kind).toBe('sars_letter');
    expect(result?.category).toBe('sars_correspondence');
  });

  it('returns null for unrelated documents', () => {
    expect(classifySarsDocument('Capitec bank statement for January')).toBeNull();
  });
});

describe('parseSarsDocumentFields', () => {
  it('extracts tax reference and tax year from ITA34 text', () => {
    const fields = parseSarsDocumentFields(
      'ita34',
      'Tax Reference Number: 9012345678\nTax Year: 2025\nAmount Assessed: R 12,500.00'
    );
    expect(fields.tax_number).toBe('9012345678');
    expect(fields.tax_year).toBe('2025');
    expect(fields.amount_assessed).toBe('12500.00');
  });
});

describe('extractTaxIdentifiers', () => {
  it('finds tax and VAT numbers in free text', () => {
    const ids = extractTaxIdentifiers('Client tax 9012345678 and VAT 4012345678');
    expect(ids.taxNumbers).toContain('9012345678');
    expect(ids.vatNumbers).toContain('4012345678');
  });
});

describe('SARS inbound detection', () => {
  it('recognises SARS sender addresses', () => {
    expect(isSarsEmailAddress('noreply@sars.gov.za')).toBe(true);
    expect(isSarsEmailAddress('client@firm.co.za')).toBe(false);
  });

  it('flags likely SARS subjects', () => {
    expect(isLikelySarsInbound('billing@firm.co.za', 'SARS ITA34 assessment', '')).toBe(true);
  });
});
