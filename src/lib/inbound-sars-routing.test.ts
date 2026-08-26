import { describe, expect, it } from 'vitest';

import {
  extractCompanyHintFromSubject,
  extractRegistrationNumbers,
} from '@/lib/inbound-sars-routing';
import { extractTaxIdentifiers } from '@/lib/sars-document-parsers';

describe('extractRegistrationNumbers', () => {
  it('finds CIPC registration numbers in text', () => {
    const text = 'Company reg 2020/123456/07 and another 2019/555555/08';
    expect(extractRegistrationNumbers(text)).toEqual([
      '2020/123456/07',
      '2019/555555/08',
    ]);
  });
});

describe('extractCompanyHintFromSubject', () => {
  it('returns null for very short subjects', () => {
    expect(extractCompanyHintFromSubject('RE:')).toBeNull();
  });

  it('extracts company from "for" pattern', () => {
    expect(extractCompanyHintFromSubject('SARS notice for Delta Logistics')).toBe(
      'Delta Logistics'
    );
  });
});

describe('combined identifier extraction', () => {
  it('extracts tax, VAT, and registration from mixed inbound text', () => {
    const text =
      'Tax ref 9012345678 VAT 4012345678 Reg 2021/111222/07 for Omega Pty Ltd';
    const { taxNumbers, vatNumbers } = extractTaxIdentifiers(text);
    expect(taxNumbers).toContain('9012345678');
    expect(vatNumbers).toContain('4012345678');
    expect(extractRegistrationNumbers(text)).toContain('2021/111222/07');
  });
});
