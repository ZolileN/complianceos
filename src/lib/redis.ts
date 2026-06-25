import { Redis } from 'ioredis';

// Create a single Redis instance to be reused
export const redis = new Redis(process.env.REDIS_URL || '', {
  maxRetriesPerRequest: 1,
  connectTimeout: 2000,
  enableOfflineQueue: false
});

redis.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

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
