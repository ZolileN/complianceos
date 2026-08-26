import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  buildCompliancePdf,
  mapComplianceItemsToRows,
} from '@/lib/compliance-export';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as { tenantId: string; role: string; id: string };
  const tenantId = currentUser.tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const where: Prisma.ComplianceItemWhereInput = { tenantId };
  if (currentUser.role === 'consultant') {
    where.client = { assignedConsultantId: currentUser.id };
  }

  try {
    const items = await prisma.complianceItem.findMany({
      where,
      include: {
        client: { select: { companyName: true, registrationNumber: true } },
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });

    const rows = mapComplianceItemsToRows(items);
    const pdf = await buildCompliancePdf(rows);
    const filename = `compliance-report-${new Date().toISOString().split('T')[0]}.pdf`;

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
