/**
 * Routes that must remain accessible without authentication.
 * Used by middleware matcher exclusions and SEO sitemap generation.
 */

export const PUBLIC_PAGE_PATHS = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/refund-policy',
  '/privacy',
  '/terms',
  '/cookies',
  '/security',
  '/help',
] as const;

export const SITE_URL = 'https://praxis.mlkcomputer.com';
