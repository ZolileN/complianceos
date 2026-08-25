import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/public-routes';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/signup', '/help', '/security', '/privacy', '/terms', '/cookies', '/refund-policy'],
      disallow: [
        '/admin',
        '/api/',
        '/dashboard',
        '/forgot-password',
        '/login',
        '/onboard/',
        '/reset-password',
        '/pay/',
        '/sign/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
