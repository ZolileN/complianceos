import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  classifySarsDocument,
  extractTaxIdentifiers,
  isLikelySarsInbound,
  isSarsEmailAddress,
  parseSarsDocumentFields,
} from '@/lib/sars-document-parsers';
import {
  extractCompanyHintFromSubject,
  extractRegistrationNumbers,
} from '@/lib/inbound-sars-routing';

const FIXTURE_DIR = join(__dirname, '__fixtures__', 'sars');

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURE_DIR, name), 'utf8');
}

describe('SARS OCR fixtures', () => {
  it('classifies ITA34 fixture text', () => {
    const text = loadFixture('ita34-sample.txt');
    const result = classifySarsDocument(text, 'ITA34_Acme.pdf');
    expect(result?.kind).toBe('ita34');
    const fields = parseSarsDocumentFields('ita34', text);
    expect(fields.tax_number).toBe('9012345678');
    expect(fields.tax_year).toBe('2025');
    expect(extractRegistrationNumbers(text)).toContain('2020/123456/07');
  });

  it('classifies VAT201 fixture text', () => {
    const text = loadFixture('vat201-sample.txt');
    const result = classifySarsDocument(text, 'VAT201_confirmation.pdf');
    expect(result?.kind).toBe('vat201_confirmation');
    const fields = parseSarsDocumentFields('vat201_confirmation', text);
    expect(fields.vat_number).toBe('4012345678');
    expect(fields.reference_number).toBeTruthy();
  });

  it('classifies SARS letter fixture text', () => {
    const text = loadFixture('sars-letter-sample.txt');
    const result = classifySarsDocument(text);
    expect(result?.kind).toBe('sars_letter');
    const ids = extractTaxIdentifiers(text);
    expect(ids.taxNumbers).toContain('9123456789');
  });
});

describe('extractCompanyHintFromSubject', () => {
  it('extracts company name from SARS subject lines', () => {
    expect(
      extractCompanyHintFromSubject('RE: ITA34 assessment for Acme Trading (Pty) Ltd')
    ).toContain('Acme Trading');
  });
});

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
