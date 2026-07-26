import { Redis as UpstashRedis } from '@upstash/redis';
import { Redis as IoRedis } from 'ioredis';

export type RedisBackend = 'upstash-rest' | 'ioredis' | 'mock';

export type RedisConfigStatus = {
  backend: RedisBackend;
  configured: boolean;
  /** Human-readable reason when Redis is unavailable or degraded. */
  detail: string;
};

type RedisClient = {
  lpush(key: string, ...values: string[]): Promise<number>;
  ltrim(key: string, start: number, stop: number): Promise<'OK' | string>;
  lrange(key: string, start: number, stop: number): Promise<string[]>;
  llen(key: string): Promise<number>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<'OK' | string>;
  rpop(key: string): Promise<string | null>;
  /**
   * Blocking pop. On Upstash REST this polls with short sleeps (serverless-safe).
   * Returns `[key, value]` or null when the timeout elapses with an empty list.
   */
  brpop(key: string, timeoutSec: number): Promise<[string, string] | null>;
  ping(): Promise<'PONG'>;
  on(event: string, handler: (...args: unknown[]) => void): void;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  // Upstash may auto-parse JSON; re-serialize so callers can JSON.parse safely.
  return JSON.stringify(value);
}

function getRestCredentials(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    '';
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    '';
  if (!url || !token) return null;
  return { url, token };
}

function getTcpUrl(): string | null {
  if (process.env.KV_URL) return process.env.KV_URL;
  if (process.env.REDIS_URL) return process.env.REDIS_URL;
  if (process.env.NODE_ENV === 'production') return null;
  return 'redis://127.0.0.1:6379';
}

function createMockClient(): RedisClient {
  return {
    lpush: async () => 1,
    ltrim: async () => 'OK',
    lrange: async () => [],
    llen: async () => 0,
    get: async () => null,
    set: async () => 'OK',
    rpop: async () => null,
    brpop: async () => null,
    ping: async () => {
      throw new Error(
        'Redis is not configured. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (preferred on Vercel) or REDIS_URL / KV_URL.'
      );
    },
    on: () => {},
  };
}

function createUpstashClient(url: string, token: string): RedisClient {
  const client = new UpstashRedis({
    url,
    token,
    // Keep list payloads as raw strings so existing JSON.parse call sites work.
    automaticDeserialization: false,
  });

  return {
    async lpush(key, ...values) {
      return client.lpush(key, ...values);
    },
    async ltrim(key, start, stop) {
      await client.ltrim(key, start, stop);
      return 'OK';
    },
    async lrange(key, start, stop) {
      const values = await client.lrange<string[]>(key, start, stop);
      return (values ?? []).map((v) => asString(v) ?? '');
    },
    async llen(key) {
      return client.llen(key);
    },
    async get(key) {
      return asString(await client.get(key));
    },
    async set(key, value) {
      await client.set(key, value);
      return 'OK';
    },
    async rpop(key) {
      return asString(await client.rpop(key));
    },
    async brpop(key, timeoutSec) {
      // REST cannot truly block; poll until timeout (or forever when timeoutSec === 0).
      const deadline =
        timeoutSec > 0 ? Date.now() + timeoutSec * 1000 : Number.POSITIVE_INFINITY;
      while (Date.now() <= deadline) {
        const value = asString(await client.rpop(key));
        if (value != null) return [key, value];
        if (timeoutSec === 0) {
          await sleep(1000);
          continue;
        }
        if (Date.now() >= deadline) break;
        await sleep(200);
      }
      return null;
    },
    async ping() {
      const result = await client.ping();
      return result === 'PONG' ? 'PONG' : 'PONG';
    },
    on() {
      // HTTP client has no connection events.
    },
  };
}

function createIoRedisClient(redisUrl: string): RedisClient {
  const client = new IoRedis(redisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    enableOfflineQueue: false,
    // Upstash TCP requires TLS when using rediss:// — ioredis handles that from the URL.
  });

  client.on('error', (err) => {
    // Suppress localhost connection errors to avoid spam when running without Redis locally.
    if (
      redisUrl === 'redis://127.0.0.1:6379' &&
      (err as Error & { code?: string }).code === 'ECONNREFUSED'
    ) {
      return;
    }
    console.error('Redis Client Error:', err);
  });

  return {
    lpush: (key, ...values) => client.lpush(key, ...values),
    ltrim: (key, start, stop) => client.ltrim(key, start, stop),
    lrange: (key, start, stop) => client.lrange(key, start, stop),
    llen: (key) => client.llen(key),
    get: (key) => client.get(key),
    set: (key, value) => client.set(key, value),
    rpop: (key) => client.rpop(key),
    brpop: async (key, timeoutSec) => {
      const result = await client.brpop(key, timeoutSec);
      if (!result) return null;
      return [result[0], result[1]];
    },
    ping: async () => {
      const pong = await client.ping();
      return pong === 'PONG' ? 'PONG' : 'PONG';
    },
    on: (event, handler) => {
      client.on(event, handler);
    },
  };
}

function resolveRedis(): { client: RedisClient; status: RedisConfigStatus } {
  const rest = getRestCredentials();
  if (rest) {
    return {
      client: createUpstashClient(rest.url, rest.token),
      status: {
        backend: 'upstash-rest',
        configured: true,
        detail: 'Using Upstash Redis REST (serverless)',
      },
    };
  }

  const tcpUrl = getTcpUrl();
  if (tcpUrl) {
    const isLocalFallback = tcpUrl === 'redis://127.0.0.1:6379';
    return {
      client: createIoRedisClient(tcpUrl),
      status: {
        backend: 'ioredis',
        configured: true,
        detail: isLocalFallback
          ? 'Using local Redis at 127.0.0.1:6379'
          : 'Using REDIS_URL / KV_URL (TCP)',
      },
    };
  }

  return {
    client: createMockClient(),
    status: {
      backend: 'mock',
      configured: false,
      detail:
        'Redis not configured. On Vercel, add Upstash Redis (sets UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN) or set REDIS_URL / KV_URL, then redeploy.',
    },
  };
}

const resolved = resolveRedis();

/** Shared Redis client (Upstash REST, ioredis TCP, or no-op mock). */
export const redis = resolved.client;

/** Static configuration status (does not prove connectivity — use ping for that). */
export function getRedisConfigStatus(): RedisConfigStatus {
  return resolved.status;
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
    payload,
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
 * Inbound Twilio messages are processed synchronously; this queue is only used
 * for optional async jobs (e.g. status callbacks) and leftover Meta payloads.
 */
export async function getQueueDepth(): Promise<number> {
  try {
    return await redis.llen('whatsapp_webhook_queue');
  } catch (error) {
    console.error('Failed to get webhook queue depth:', error);
    return 0;
  }
}
