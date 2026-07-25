import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  isPlatformAdminResponse,
  requirePlatformAdmin,
} from '@/lib/platform-admin';

const PLAN_LIMITS: Record<string, number> = {
  starter: 1000,
  growth: 10000,
  professional: 50000,
  enterprise: 250000,
};

export async function GET() {
  const admin = await requirePlatformAdmin();
  if (isPlatformAdminResponse(admin)) return admin;

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalMessages, messages24h, documentsTotal, tenants] =
      await Promise.all([
        prisma.message.count(),
        prisma.message.count({ where: { createdAt: { gte: dayAgo } } }),
        prisma.document.count(),
        prisma.tenant.findMany({
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            isActive: true,
            _count: {
              select: {
                messages: { where: { createdAt: { gte: startOfMonth } } },
                documents: true,
                users: true,
                clients: true,
              },
            },
          },
        }),
      ]);

    const usage = tenants
      .map((t) => {
        const planKey = t.plan.toLowerCase();
        const limit = PLAN_LIMITS[planKey] || 1000;
        const messages = t._count.messages;
        return {
          id: t.id,
          name: t.name,
          slug: t.slug,
          plan: t.plan,
          isActive: t.isActive,
          messagesMonth: messages,
          limit,
          utilization: Math.min(100, Math.round((messages / limit) * 100)),
          documents: t._count.documents,
          users: t._count.users,
          clients: t._count.clients,
        };
      })
      .sort((a, b) => b.messagesMonth - a.messagesMonth);

    const topTenantRow = usage[0];
    const topTenant = topTenantRow
      ? {
          name: topTenantRow.name,
          plan: topTenantRow.plan,
          /** @deprecated use messagesMonth — kept for UI compat */
          tokens: topTenantRow.messagesMonth,
          messagesMonth: topTenantRow.messagesMonth,
          limit: topTenantRow.limit,
          limitEnforced: false,
        }
      : {
          name: 'No active tenants',
          plan: 'starter',
          tokens: 0,
          messagesMonth: 0,
          limit: 1000,
          limitEnforced: false,
        };

    const starterTenants = usage.filter(
      (t) => t.plan.toLowerCase() === 'starter'
    );
    const topStarterRow = starterTenants[0];
    const topStarter = topStarterRow
      ? {
          name: topStarterRow.name,
          tokens: topStarterRow.messagesMonth,
          messagesMonth: topStarterRow.messagesMonth,
          limit: 1000,
        }
      : { name: 'No active starter tenants', tokens: 0, messagesMonth: 0, limit: 1000 };

    const byPlan = Object.fromEntries(
      Object.keys(PLAN_LIMITS).map((plan) => [
        plan,
        usage.filter((t) => t.plan.toLowerCase() === plan).length,
      ])
    );

    return NextResponse.json({
      success: true,
      totalMessages,
      messages24h,
      documentsTotal,
      topTenant,
      topStarter,
      byPlan,
      tenants: usage.slice(0, 25),
    });
  } catch (error: unknown) {
    console.error('FinOps API Error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve finops data' },
      { status: 500 }
    );
  }
}
