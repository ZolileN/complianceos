import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as { tenantId: string; role: string; email: string; id: string };
  const tenantId = currentUser.tenantId;
  
  if (currentUser.role !== 'administrator') {
    return NextResponse.json({ error: 'Forbidden. Only administrators can view audit logs.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get('entityType');
  const userId = searchParams.get('userId');
  const action = searchParams.get('action');
  
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  const where: Prisma.AuditLogWhereInput = {
    tenantId,
    ...(entityType ? { entityType } : {}),
    ...(userId ? { userId } : {}),
    ...(action ? { action } : {}),
  };

  try {
    const data = await prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    const count = await prisma.auditLog.count({ where });

    return NextResponse.json({ data, count });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
