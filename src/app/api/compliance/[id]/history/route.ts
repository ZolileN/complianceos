import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const currentUser = session.user as { tenantId: string; role: string; email: string; id: string };
  const tenantId = currentUser.tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: complianceItemId } = await params;

  // Verify the compliance item exists and belongs to this tenant
  const item = await prisma.complianceItem.findFirst({
    where: { id: complianceItemId, tenantId }
  });

  if (!item) {
    return NextResponse.json({ error: 'Compliance item not found' }, { status: 404 });
  }

  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: 'ComplianceItem',
        entityId: complianceItemId,
        tenantId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ data: logs });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
