import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? 'mlk-computer-consulting',
  project: process.env.SENTRY_PROJECT ?? 'praxisone',
  // Only attempt source-map upload when an auth token is present.
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  tunnelRoute: '/monitoring',
  // Avoid failing builds when SENTRY_AUTH_TOKEN is not configured.
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
