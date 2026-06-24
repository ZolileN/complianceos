import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as { tenantId: string; role: string; id: string; email: string };
  const tenantId = currentUser.tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const where: Prisma.ComplianceItemWhereInput = { tenantId };
  
  if (currentUser.role === 'consultant') {
    where.client = { assignedConsultantId: currentUser.id };
  } else if (currentUser.role === 'client') {
    where.client = { email: currentUser.email };
  }

  try {
    const complianceItems = await prisma.complianceItem.findMany({
      where,
      include: {
        client: {
          select: { id: true, companyName: true, status: true }
        },
        documents: {
          select: { id: true, name: true, filePath: true }
        }
      },
      orderBy: [
        { status: 'asc' }, // critical, action_required, compliant
        { dueDate: 'asc' }
      ]
    });

    // Sort to ensure critical/action_required are first. Prisma string sort is alphabetical: 
    // 'action_required', 'compliant', 'critical', 'not_applicable'
    // Let's enforce a custom sort order: critical (0), action_required (1), compliant (2), not_applicable (3)
    const statusWeight: Record<string, number> = {
      'critical': 0,
      'action_required': 1,
      'compliant': 2,
      'not_applicable': 3
    };

    const sortedItems = complianceItems.sort((a, b) => {
      const weightA = statusWeight[a.status] ?? 99;
      const weightB = statusWeight[b.status] ?? 99;
      if (weightA !== weightB) return weightA - weightB;
      
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      return dateA - dateB;
    });

    return NextResponse.json({ data: sortedItems });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
