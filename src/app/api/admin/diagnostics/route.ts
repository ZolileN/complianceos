import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  isPlatformAdminResponse,
  requirePlatformAdmin,
} from '@/lib/platform-admin';
import { checkOzowMerchant } from '@/lib/billing/ozow-health';
import { checkPaystackCredentials } from '@/lib/billing/paystack-health';
import { getQueueDepth, getRedisConfigStatus, redis } from '@/lib/redis';

async function pingRedis(): Promise<{
  ok: boolean;
  latencyMs: number | null;
  configured: boolean;
  backend: string;
  detail: string;
  error?: string;
}> {
  const config = getRedisConfigStatus();
  if (!config.configured) {
    return {
      ok: false,
      latencyMs: null,
      configured: false,
      backend: config.backend,
      detail: config.detail,
      error: 'not_configured',
    };
  }

  const start = Date.now();
  try {
    const pong = await redis.ping();
    return {
      ok: pong === 'PONG',
      latencyMs: Date.now() - start,
      configured: true,
      backend: config.backend,
      detail: config.detail,
    };
  } catch (err) {
    return {
      ok: false,
      latencyMs: null,
      configured: true,
      backend: config.backend,
      detail: config.detail,
      error: err instanceof Error ? err.message : 'Redis ping failed',
    };
  }
}

async function pingDatabase(): Promise<{
  ok: boolean;
  latencyMs: number | null;
  tenantCount: number;
}> {
  const start = Date.now();
  try {
    const tenantCount = await prisma.tenant.count();
    return { ok: true, latencyMs: Date.now() - start, tenantCount };
  } catch {
    return { ok: false, latencyMs: null, tenantCount: 0 };
  }
}

export async function GET() {
  const admin = await requirePlatformAdmin();
  if (isPlatformAdminResponse(admin)) return admin;

  try {
    const [
      queueDepth,
      redisHealth,
      dbHealth,
      ozowHealth,
      paystackHealth,
      aggregates,
      lastVacuumTimestamp,
    ] = await Promise.all([
      getQueueDepth().catch(() => -1),
      pingRedis(),
      pingDatabase(),
      checkOzowMerchant(),
      checkPaystackCredentials(),
      prisma.$transaction([
        prisma.tenant.count({ where: { isActive: true } }),
        prisma.tenant.count({ where: { isActive: false } }),
        prisma.user.count({ where: { isActive: true } }),
        prisma.client.count(),
        prisma.conversation.count({ where: { status: 'open' } }),
        prisma.message.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.document.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.task.count({
          where: { status: { in: ['new', 'processing', 'waiting_on_client'] } },
        }),
      ]),
      redis.get('last_vacuum_timestamp').catch(() => null),
    ]);

    const [
      activeTenants,
      suspendedTenants,
      activeUsers,
      clients,
      openConversations,
      messages24h,
      documents24h,
      openTasks,
    ] = aggregates;

    const overallOk = redisHealth.ok && dbHealth.ok;

    return NextResponse.json({
      success: true,
      queueDepth,
      lastVacuumTimestamp,
      health: {
        overall: overallOk ? 'healthy' : 'degraded',
        checkedAt: new Date().toISOString(),
        redis: redisHealth,
        database: dbHealth,
        ozow: ozowHealth,
        paystack: paystackHealth,
        process: {
          uptimeSeconds: Math.floor(process.uptime()),
          nodeVersion: process.version,
          memoryRssMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
          memoryHeapUsedMb: Math.round(
            process.memoryUsage().heapUsed / (1024 * 1024)
          ),
        },
      },
      aggregates: {
        activeTenants,
        suspendedTenants,
        activeUsers,
        clients,
        openConversations,
        messages24h,
        documents24h,
        openTasks,
      },
    });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : 'Failed to retrieve diagnostics';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
