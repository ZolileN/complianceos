import type { MetadataRoute } from 'next';

const SITE_URL = 'https://praxis.mlkcomputer.com';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      changeFrequency: 'monthly',
      priority: 1,
    },
  ];
}
