import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string; tenantSlug?: string } | undefined;
  
  if (!session || user?.role !== 'administrator' || !['praxisone', 'mlk-computer-consulting'].includes(user?.tenantSlug as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Total Messages Metered
    const totalMessages = await prisma.message.count();

    // 2. Top Tenant Workspace Usage
    // Calculate start of current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const tenants = await prisma.tenant.findMany({
      select: {
        name: true,
        plan: true,
        _count: {
          select: {
            messages: {
              where: { createdAt: { gte: startOfMonth } }
            }
          }
        }
      }
    });

    const PLAN_LIMITS: Record<string, number> = {
      starter: 1000,
      growth: 10000,
      professional: 50000,
      enterprise: 250000,
    };

    let topTenant = { name: "No active tenants", plan: "starter", tokens: 0, limit: 1000 };
    if (tenants.length > 0) {
      tenants.sort((a, b) => b._count.messages - a._count.messages);
      const top = tenants[0];
      const limit = PLAN_LIMITS[top.plan.toLowerCase()] || 1000;
      topTenant = {
        name: top.name,
        plan: top.plan,
        tokens: top._count.messages,
        limit
      };
    }

    // Retain topStarter for backwards compatibility
    const starterTenants = tenants.filter(t => t.plan.toLowerCase() === 'starter');
    let topStarter = { name: "No active starter tenants", tokens: 0, limit: 1000 };
    if (starterTenants.length > 0) {
      const topS = starterTenants[0];
      topStarter = {
        name: topS.name,
        tokens: topS._count.messages,
        limit: 1000
      };
    }

    return NextResponse.json({
      success: true,
      totalMessages,
      topTenant,
      topStarter
    });
  } catch (error: unknown) {
    console.error('FinOps API Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve finops data' }, { status: 500 });
  }
}
