import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  isConsultant,
  isRbacResponse,
  requireManager,
  requireStaff,
  requireTenantSession,
} from '@/lib/rbac';
import { logAuditAction } from '@/lib/auditLogger';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireTenantSession();
  if (isRbacResponse(user)) return user;
  const forbidden = requireStaff(user);
  if (forbidden) return forbidden;

  const { id } = await params;

  try {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        tenantId: user.tenantId!,
        ...(isConsultant(user)
          ? { OR: [{ assignedTo: user.id }, { assignedTo: null }] }
          : {}),
      },
      include: {
        client: { select: { id: true, companyName: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        ...conversation,
        whatsapp_number: conversation.whatsappNumber,
        last_message_at: conversation.lastMessageAt,
        client: conversation.client
          ? {
              id: conversation.client.id,
              company_name: conversation.client.companyName,
            }
          : null,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PATCH — close / reopen / archive / assign conversation (lifecycle).
 * status: open | closed | pending | archived
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireTenantSession();
  if (isRbacResponse(user)) return user;
  const forbidden = requireStaff(user);
  if (forbidden) return forbidden;

  const { id } = await params;
  const body = await request.json();
  const { status, assignedTo, assignToMe } = body as {
    status?: string;
    assignedTo?: string | null;
    assignToMe?: boolean;
  };

  const allowedStatuses = ['open', 'closed', 'pending', 'archived'];

  try {
    const existing = await prisma.conversation.findFirst({
      where: { id, tenantId: user.tenantId! },
      select: { id: true, status: true, assignedTo: true, clientId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (isConsultant(user)) {
      const isMine = existing.assignedTo === user.id;
      const isUnassigned = existing.assignedTo === null;
      const claiming =
        assignToMe === true ||
        (assignedTo !== undefined && assignedTo === user.id);
      if (!isMine && !(isUnassigned && claiming)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const data: { status?: string; assignedTo?: string | null } = {};

    if (typeof status === 'string') {
      if (!allowedStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      data.status = status;
    }

    if (assignToMe === true) {
      data.assignedTo = user.id;
    } else if (assignedTo !== undefined) {
      // Only managers can reassign to others
      if (assignedTo !== user.id && assignedTo !== null) {
        const managerGate = requireManager(user);
        if (managerGate) return managerGate;
      }
      if (assignedTo) {
        const assignee = await prisma.user.findFirst({
          where: {
            id: assignedTo,
            tenantId: user.tenantId!,
            isActive: true,
          },
          select: { id: true, role: true },
        });
        if (!assignee || assignee.role === 'client') {
          return NextResponse.json(
            { error: 'Invalid assignee' },
            { status: 400 }
          );
        }
      }
      data.assignedTo = assignedTo;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No changes requested' }, { status: 400 });
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data,
      include: {
        client: { select: { id: true, companyName: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    });

    await logAuditAction({
      tenantId: user.tenantId!,
      userId: user.id,
      action: 'UPDATE',
      entityType: 'Conversation',
      entityId: id,
      details: data,
    });

    return NextResponse.json({
      data: {
        ...updated,
        whatsapp_number: updated.whatsappNumber,
        last_message_at: updated.lastMessageAt,
        client: updated.client
          ? {
              id: updated.client.id,
              company_name: updated.client.companyName,
            }
          : null,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
