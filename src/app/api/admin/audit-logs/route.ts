import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string; tenantSlug?: string } | undefined;
  
  if (!session || user?.role !== 'administrator' || user?.tenantSlug !== 'praxisone') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const logs = await prisma.adminAuditLog.findMany({
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to retrieve system audit logs';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
