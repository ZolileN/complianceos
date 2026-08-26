import type { MetadataRoute } from 'next';

import { PUBLIC_PAGE_PATHS, SITE_URL } from '@/lib/public-routes';
import { HELP_ARTICLE_SLUGS } from '@/lib/help-articles';

const PAGE_META: Record<string, { changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }> = {
  '/': { changeFrequency: 'weekly', priority: 1 },
  '/signup': { changeFrequency: 'monthly', priority: 0.9 },
  '/help': { changeFrequency: 'weekly', priority: 0.8 },
  '/security': { changeFrequency: 'monthly', priority: 0.7 },
  '/privacy': { changeFrequency: 'yearly', priority: 0.5 },
  '/dpa': { changeFrequency: 'yearly', priority: 0.5 },
  '/terms': { changeFrequency: 'yearly', priority: 0.5 },
  '/cookies': { changeFrequency: 'yearly', priority: 0.4 },
  '/refund-policy': { changeFrequency: 'yearly', priority: 0.4 },
  '/login': { changeFrequency: 'monthly', priority: 0.3 },
  '/forgot-password': { changeFrequency: 'yearly', priority: 0.2 },
  '/reset-password': { changeFrequency: 'yearly', priority: 0.1 },
};

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticPages = PUBLIC_PAGE_PATHS.map((path) => {
    const meta = PAGE_META[path] ?? { changeFrequency: 'monthly' as const, priority: 0.5 };
    return {
      url: path === '/' ? SITE_URL : `${SITE_URL}${path}`,
      lastModified,
      changeFrequency: meta.changeFrequency,
      priority: meta.priority,
    };
  });

  const helpArticles = HELP_ARTICLE_SLUGS.map((slug) => ({
    url: `${SITE_URL}/help/${slug}`,
    lastModified,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...helpArticles];
}
