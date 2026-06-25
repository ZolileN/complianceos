import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string; tenantSlug?: string } | undefined;
  
  if (!session || user?.role !== 'administrator' || user?.tenantSlug !== 'praxisone') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Total Messages Metered
    const totalMessages = await prisma.message.count();

    // 2. Top Starter Workspace Usage
    // Calculate start of current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const starterTenants = await prisma.tenant.findMany({
      where: { plan: 'starter' },
      select: {
        name: true,
        _count: {
          select: {
            messages: {
              where: { createdAt: { gte: startOfMonth } }
            }
          }
        }
      }
    });

    let topStarter = { name: "No active starter tenants", tokens: 0, limit: 1000 };
    if (starterTenants.length > 0) {
      starterTenants.sort((a, b) => b._count.messages - a._count.messages);
      const top = starterTenants[0];
      topStarter = {
        name: top.name,
        tokens: top._count.messages,
        limit: 1000
      };
    }

    return NextResponse.json({
      success: true,
      totalMessages,
      topStarter
    });
  } catch (error: unknown) {
    console.error('FinOps API Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve finops data' }, { status: 500 });
  }
}
