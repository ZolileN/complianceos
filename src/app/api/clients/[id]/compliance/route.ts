import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { logAuditAction } from '@/lib/auditLogger';

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
      include: {
        documents: {
          select: {
            id: true,
            name: true,
            filePath: true,
            fileType: true,
            category: true,
            createdAt: true,
          }
        }
      },
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
          status: 'action_required',
          notes: ''
        }))
      });

      items = await prisma.complianceItem.findMany({
        where: { clientId, tenantId },
        include: {
          documents: {
            select: {
              id: true,
              name: true,
              filePath: true,
              fileType: true,
              category: true,
              createdAt: true,
            }
          }
        },
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
      updated_at: item.updatedAt.toISOString(),
      documents: item.documents || []
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

    // Handle document linking if documentIds are provided
    await prisma.document.updateMany({
      where: { complianceItemId: updated.id, clientId, tenantId },
      data: { complianceItemId: null }
    });

    if (body.documentIds && Array.isArray(body.documentIds) && body.documentIds.length > 0) {
      await prisma.document.updateMany({
        where: { id: { in: body.documentIds }, clientId, tenantId },
        data: { complianceItemId: updated.id }
      });
    }

    // Fetch the updated documents
    const updatedDocuments = await prisma.document.findMany({
      where: { complianceItemId: updated.id },
      select: {
        id: true,
        name: true,
        filePath: true,
        fileType: true,
        category: true,
        createdAt: true
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
      updated_at: updated.updatedAt.toISOString(),
      documents: updatedDocuments
    };

    // Send notification if client user exists and status requires action
    if (client.email && (updated.status === 'action_required' || updated.status === 'critical')) {
      const clientUser = await prisma.user.findFirst({
        where: {
          role: 'client',
          email: client.email,
          tenantId: tenantId
        }
      });
      if (clientUser) {
        await prisma.notification.create({
          data: {
            userId: clientUser.id,
            title: `Compliance Action Needed: ${updated.name}`,
            message: `Status updated to "${updated.status.replace('_', ' ')}" for ${updated.category} - ${updated.name}. Notes: ${updated.notes || 'None'}`,
            type: updated.status === 'critical' ? 'error' : 'warning',
            link: `/dashboard`
          }
        });
      }
    }

    await logAuditAction({
      tenantId,
      userId: currentUser.id,
      action: 'UPDATE',
      entityType: 'ComplianceItem',
      entityId: updated.id,
      details: { category: updated.category, name: updated.name, status: updated.status },
    });

    return NextResponse.json({ data: mapped });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
