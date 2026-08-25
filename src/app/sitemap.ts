import type { MetadataRoute } from 'next';

import { PUBLIC_PAGE_PATHS, SITE_URL } from '@/lib/public-routes';

const PAGE_META: Record<string, { changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }> = {
  '/': { changeFrequency: 'weekly', priority: 1 },
  '/signup': { changeFrequency: 'monthly', priority: 0.9 },
  '/help': { changeFrequency: 'weekly', priority: 0.8 },
  '/security': { changeFrequency: 'monthly', priority: 0.7 },
  '/privacy': { changeFrequency: 'yearly', priority: 0.5 },
  '/terms': { changeFrequency: 'yearly', priority: 0.5 },
  '/cookies': { changeFrequency: 'yearly', priority: 0.4 },
  '/refund-policy': { changeFrequency: 'yearly', priority: 0.4 },
  '/login': { changeFrequency: 'monthly', priority: 0.3 },
  '/forgot-password': { changeFrequency: 'yearly', priority: 0.2 },
  '/reset-password': { changeFrequency: 'yearly', priority: 0.1 },
};

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_PAGE_PATHS.map((path) => {
    const meta = PAGE_META[path] ?? { changeFrequency: 'monthly' as const, priority: 0.5 };
    return {
      url: path === '/' ? SITE_URL : `${SITE_URL}${path}`,
      lastModified,
      changeFrequency: meta.changeFrequency,
      priority: meta.priority,
    };
  });
}
