import * as Sentry from '@sentry/nextjs';
import { getRedisConfigStatus, redis } from '@/lib/redis';

/**
 * Verify Redis connectivity and alert via Sentry when production Redis is down.
 * Uses stable fingerprints so repeated cron checks group into one issue.
 */
export async function assertRedisHealthy(context: string): Promise<boolean> {
  const config = getRedisConfigStatus();

  if (!config.configured) {
    Sentry.captureMessage(`Redis not configured (${context})`, {
      level: 'error',
      tags: {
        component: 'redis',
        reason: 'not_configured',
        context,
      },
      fingerprint: ['redis-not-configured'],
      extra: { detail: config.detail, backend: config.backend },
    });
    return false;
  }

  try {
    const pong = await redis.ping();
    if (pong !== 'PONG') {
      throw new Error(`Unexpected Redis ping response: ${String(pong)}`);
    }
    return true;
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        component: 'redis',
        reason: 'ping_failed',
        context,
        backend: config.backend,
      },
      fingerprint: ['redis-ping-failed'],
      extra: { detail: config.detail },
    });
    return false;
  }
}

export function captureRouteError(
  error: unknown,
  context: string,
  extras?: Record<string, unknown>
): void {
  Sentry.captureException(error, {
    tags: { component: 'api', context },
    extra: extras,
  });
}
