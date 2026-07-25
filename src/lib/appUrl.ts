/**
 * Canonical public app origin for shareable links (onboarding, invites, etc.).
 * Prefer NEXT_PUBLIC_APP_URL so local "Copy Link" still shares the production domain.
 */

const PRODUCTION_ORIGIN = 'https://praxis.mlkcomputer.com';

export function getAppBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    let url = fromEnv.replace(/\/$/, '');
    if (!url.startsWith('http')) {
      url = url.includes('localhost') ? `http://${url}` : `https://${url}`;
    }
    return url;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }

  return PRODUCTION_ORIGIN;
}

export function getOnboardingUrl(slug: string): string {
  return `${getAppBaseUrl()}/onboard/${slug}`;
}
