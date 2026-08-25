import { HELP_ARTICLES } from './help-articles';

export type HelpArticle = {
  title: string;
  summary: string;
  href: string;
  category: string;
};

export const HELP_CENTER_CATEGORIES = [
  'Getting started',
  'Clients & compliance',
  'Documents & OCR',
  'Communications',
  'Billing & plans',
] as const;

export const HELP_CENTER_ARTICLES: HelpArticle[] = HELP_ARTICLES.map((article) => ({
  title: article.title,
  summary: article.summary,
  category: article.category,
  href:
    article.slug === 'plans-and-trials'
      ? '/#pricing'
      : article.slug === 'billing-refunds'
        ? '/refund-policy'
        : `/help/${article.slug}`,
}));
