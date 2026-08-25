import { describe, expect, it } from 'vitest';

import { searchHelpArticles } from '@/lib/help-search';

describe('searchHelpArticles', () => {
  it('returns VAT-related articles for VAT query', () => {
    const results = searchHelpArticles('VAT201');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.slug === 'sars-document-intelligence')).toBe(true);
  });

  it('returns empty for very short queries', () => {
    expect(searchHelpArticles('a')).toEqual([]);
  });

  it('ranks title matches higher', () => {
    const results = searchHelpArticles('WhatsApp');
    expect(results[0]?.slug).toBe('connect-whatsapp');
  });
});
