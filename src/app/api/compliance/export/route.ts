import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../../auth/[...nextauth]/route';

function csvEscape(value: string | number | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

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

    const header = [
      'Client',
      'Registration Number',
      'Category',
      'Obligation',
      'Status',
      'Due Date',
      'Last Checked',
    ].join(',');

    const rows = items.map((item) =>
      [
        csvEscape(item.client.companyName),
        csvEscape(item.client.registrationNumber),
        csvEscape(item.category),
        csvEscape(item.name),
        csvEscape(item.status),
        csvEscape(item.dueDate ? item.dueDate.toISOString().split('T')[0] : ''),
        csvEscape(item.lastChecked.toISOString().split('T')[0]),
      ].join(',')
    );

    const csv = [header, ...rows].join('\n');
    const filename = `compliance-export-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
