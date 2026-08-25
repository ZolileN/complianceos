import { HELP_ARTICLES, type HelpArticleContent } from '@/lib/help-articles';

export type HelpSearchResult = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  href: string;
  score: number;
  snippet: string;
};

function articleHref(slug: string): string {
  if (slug === 'plans-and-trials') return '/#pricing';
  if (slug === 'billing-refunds') return '/refund-policy';
  return `/help/${slug}`;
}

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function buildSearchableText(article: HelpArticleContent): string {
  const sectionText = article.sections
    .flatMap((s) => [...s.paragraphs, ...(s.bullets || []), s.heading || ''])
    .join(' ');
  return `${article.title} ${article.summary} ${article.category} ${sectionText}`.toLowerCase();
}

function snippetFor(article: HelpArticleContent, tokens: string[]): string {
  const haystack = buildSearchableText(article);
  for (const token of tokens) {
    const idx = haystack.indexOf(token);
    if (idx === -1) continue;
    const start = Math.max(0, idx - 40);
    const end = Math.min(haystack.length, idx + 80);
    const raw = haystack.slice(start, end).replace(/\s+/g, ' ').trim();
    return (start > 0 ? '…' : '') + raw + (end < haystack.length ? '…' : '');
  }
  return article.summary;
}

export function searchHelpArticles(query: string, limit = 12): HelpSearchResult[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const tokens = tokenize(trimmed);
  if (tokens.length === 0) return [];

  const results: HelpSearchResult[] = [];

  for (const article of HELP_ARTICLES) {
    const haystack = buildSearchableText(article);
    let score = 0;

    for (const token of tokens) {
      if (article.title.toLowerCase().includes(token)) score += 8;
      if (article.summary.toLowerCase().includes(token)) score += 4;
      if (article.category.toLowerCase().includes(token)) score += 2;
      if (haystack.includes(token)) score += 1;
    }

    if (score === 0) continue;

    results.push({
      slug: article.slug,
      title: article.title,
      summary: article.summary,
      category: article.category,
      href: articleHref(article.slug),
      score,
      snippet: snippetFor(article, tokens),
    });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}
