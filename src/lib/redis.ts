import { Redis } from 'ioredis';

const getRedisUrl = () => {
  if (process.env.KV_URL) return process.env.KV_URL;
  if (process.env.REDIS_URL) return process.env.REDIS_URL;
  if (process.env.NODE_ENV === 'production') return null;
  // Fallback to localhost for local development
  return 'redis://127.0.0.1:6379';
};

const redisUrl = getRedisUrl();

// Create a single Redis instance to be reused or a mock if missing in production
export const redis = redisUrl 
  ? new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      enableOfflineQueue: false
    })
  : ({
      lpush: async () => 1,
      ltrim: async () => 'OK',
      lrange: async () => [],
      llen: async () => 0,
      get: async () => null,
      set: async () => 'OK',
      brpop: async () => null,
      on: () => {},
    } as unknown as Redis);

if (redisUrl) {
  redis.on('error', (err) => {
    // Suppress localhost connection errors to avoid spam when running without Redis locally
    if (redisUrl === 'redis://127.0.0.1:6379' && (err as Error & { code?: string }).code === 'ECONNREFUSED') {
      return;
    }
    console.error('Redis Client Error:', err);
  });
}

export interface RedisTenantLog {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  payload?: Record<string, unknown>;
}

/**
 * Pushes a log entry for a specific tenant and trims the list to a fixed depth of 500 lines.
 */
export async function pushTenantLog(
  tenantId: string,
  message: string,
  type: string = 'system',
  payload?: Record<string, unknown>
): Promise<void> {
  const logKey = `tenant_logs:${tenantId}`;
  const logEntry: RedisTenantLog = {
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    type,
    message,
    payload
  };

  try {
    await redis.lpush(logKey, JSON.stringify(logEntry));
    await redis.ltrim(logKey, 0, 499);
  } catch (error) {
    console.error(`Failed to push Redis log for tenant ${tenantId}:`, error);
  }
}

/**
 * Retrieves the capped list of logs for a specific tenant.
 */
export async function getTenantLogs(tenantId: string): Promise<RedisTenantLog[]> {
  const logKey = `tenant_logs:${tenantId}`;
  try {
    const rawLogs = await redis.lrange(logKey, 0, -1);
    return rawLogs.map((item) => JSON.parse(item));
  } catch (error) {
    console.error(`Failed to fetch Redis logs for tenant ${tenantId}:`, error);
    return [];
  }
}

/**
 * Returns the current backlog depth of the WhatsApp webhook ingestion queue.
 */
export async function getQueueDepth(): Promise<number> {
  try {
    return await redis.llen('whatsapp_webhook_queue');
  } catch (error) {
    console.error('Failed to get webhook queue depth:', error);
    return 0;
  }
}
