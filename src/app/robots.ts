import type { MetadataRoute } from 'next';

const SITE_URL = 'https://praxis.mlkcomputer.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/api/',
        '/dashboard',
        '/forgot-password',
        '/login',
        '/onboard/',
        '/reset-password',
        '/signup',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
