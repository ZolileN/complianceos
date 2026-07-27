import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { logAuditAction } from '@/lib/auditLogger';
import { seedComplianceRows } from '@/lib/compliance-catalog';
import {
  emitComplianceStatusChanged,
  nextDueAfterCompliant,
  notifyComplianceStakeholders,
} from '@/lib/compliance-monitor';
import { requireStaff } from '@/lib/rbac';

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

  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId },
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
          },
        },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    if (items.length === 0) {
      await prisma.complianceItem.createMany({
        data: seedComplianceRows(clientId, tenantId),
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
            },
          },
        },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });
    }

    const mapped = items.map((item) => ({
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
      documents: item.documents || [],
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

  const forbidden = requireStaff(currentUser);
  if (forbidden) return forbidden;

  const { id: clientId } = await params;

  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId },
  });

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Compliance Item ID is required' }, { status: 400 });
    }

    const existing = await prisma.complianceItem.findFirst({
      where: { id: body.id, clientId, tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Compliance item not found' }, { status: 404 });
    }

    const previousStatus = existing.status;
    let dueDate = body.due_date !== undefined
      ? (body.due_date ? new Date(body.due_date) : null)
      : existing.dueDate;

    // Roll forward when newly marked compliant and caller did not set an explicit due date
    if (
      body.status === 'compliant' &&
      previousStatus !== 'compliant' &&
      body.due_date === undefined
    ) {
      dueDate = nextDueAfterCompliant(existing.category, existing.name, existing.dueDate);
    }

    const updated = await prisma.complianceItem.update({
      where: { id: body.id },
      data: {
        status: body.status,
        dueDate,
        notes: body.notes,
        lastChecked: new Date(),
      },
    });

    await prisma.document.updateMany({
      where: { complianceItemId: updated.id, clientId, tenantId },
      data: { complianceItemId: null },
    });

    if (body.documentIds && Array.isArray(body.documentIds) && body.documentIds.length > 0) {
      await prisma.document.updateMany({
        where: { id: { in: body.documentIds }, clientId, tenantId },
        data: { complianceItemId: updated.id },
      });
    }

    const updatedDocuments = await prisma.document.findMany({
      where: { complianceItemId: updated.id },
      select: {
        id: true,
        name: true,
        filePath: true,
        fileType: true,
        category: true,
        createdAt: true,
      },
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
      documents: updatedDocuments,
    };

    const itemLike = {
      id: updated.id,
      clientId: updated.clientId,
      tenantId: updated.tenantId,
      category: updated.category,
      name: updated.name,
      status: updated.status,
      dueDate: updated.dueDate,
    };

    if (previousStatus !== updated.status) {
      await emitComplianceStatusChanged(
        itemLike,
        previousStatus,
        currentUser.id,
        currentUser.role
      );

      await notifyComplianceStakeholders(
        itemLike,
        {
          title: `Compliance updated: ${updated.name}`,
          message: `${client.companyName} — ${updated.category} / ${updated.name} is now "${updated.status.replace(/_/g, ' ')}".`,
          type:
            updated.status === 'critical'
              ? 'error'
              : updated.status === 'action_required'
                ? 'warning'
                : 'success',
          dedupeKey: `status-${updated.status}`,
        },
        client.assignedConsultantId
      );
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
