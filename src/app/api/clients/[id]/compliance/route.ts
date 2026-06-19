import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

const DEFAULT_COMPLIANCE_ITEMS = [
  { category: 'SARS', name: 'VAT' },
  { category: 'SARS', name: 'PAYE' },
  { category: 'SARS', name: 'Income Tax' },
  { category: 'CIPC', name: 'Annual Returns' },
  { category: 'CIPC', name: 'Beneficial Ownership' },
  { category: 'Labour', name: 'UIF' },
  { category: 'Labour', name: 'COIDA' },
  { category: 'Labour', name: 'Employment Equity' },
  { category: 'BEE', name: 'Certificate Expiry' },
  { category: 'BEE', name: 'Verification Schedule' }
];

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

  const { id: clientId } = await params;

  // Verify client belongs to this tenant
  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId }
  });

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  try {
    let items = await prisma.complianceItem.findMany({
      where: { clientId, tenantId },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    // Auto-initialize if no items exist
    if (items.length === 0) {
      await prisma.complianceItem.createMany({
        data: DEFAULT_COMPLIANCE_ITEMS.map(item => ({
          clientId,
          tenantId,
          category: item.category,
          name: item.name,
          status: 'compliant',
          notes: ''
        }))
      });

      items = await prisma.complianceItem.findMany({
        where: { clientId, tenantId },
        orderBy: [
          { category: 'asc' },
          { name: 'asc' }
        ]
      });
    }

    const mapped = items.map(item => ({
      id: item.id,
      client_id: item.clientId,
      tenant_id: item.tenantId,
      category: item.category,
      name: item.name,
      status: item.status,
      due_date: item.dueDate ? item.dueDate.toISOString() : null,
      last_checked: item.lastChecked.toISOString(),
      notes: item.notes,
      created_at: item.createdAt.toISOString(),
      updated_at: item.updatedAt.toISOString()
    }));

    return NextResponse.json({ data: mapped });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(
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

  // Only staff roles can update compliance records
  if (currentUser.role === 'client') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: clientId } = await params;

  // Verify client belongs to this tenant
  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId }
  });

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Compliance Item ID is required' }, { status: 400 });
    }

    const updated = await prisma.complianceItem.update({
      where: { id: body.id, clientId, tenantId },
      data: {
        status: body.status,
        dueDate: body.due_date ? new Date(body.due_date) : null,
        notes: body.notes,
        lastChecked: new Date()
      }
    });

    const mapped = {
      id: updated.id,
      client_id: updated.clientId,
      tenant_id: updated.tenantId,
      category: updated.category,
      name: updated.name,
      status: updated.status,
      due_date: updated.dueDate ? updated.dueDate.toISOString() : null,
      last_checked: updated.lastChecked.toISOString(),
      notes: updated.notes,
      created_at: updated.createdAt.toISOString(),
      updated_at: updated.updatedAt.toISOString()
    };

    return NextResponse.json({ data: mapped });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
