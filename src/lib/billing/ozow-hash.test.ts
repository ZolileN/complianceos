import { createHash } from 'crypto';
import { describe, expect, it } from 'vitest';
import { buildOzowHash } from '@/lib/billing/providers/ozow';

describe('buildOzowHash', () => {
  it('lowercases the concatenated payload before hashing', () => {
    const fields = [
      'SITE',
      'ZA',
      'ZAR',
      '10.00',
      'REF',
      'BANK',
      'https://example.com/c',
      'https://example.com/e',
      'https://example.com/s',
      'https://example.com/n',
      'true',
    ];
    const privateKey = 'SecretKey';
    const expected = createHash('sha512')
      .update(`${fields.join('')}${privateKey}`.toLowerCase(), 'utf8')
      .digest('hex');

    expect(buildOzowHash(fields, privateKey)).toBe(expected);
  });
});
