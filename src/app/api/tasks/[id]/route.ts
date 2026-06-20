import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { logAuditAction } from '@/lib/auditLogger';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const currentUser = session.user as { tenantId: string; role: string; id: string };
  const tenantId = currentUser.tenantId;

  // Clients cannot modify tasks
  if (currentUser.role === 'client') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const existingTask = await prisma.task.findFirst({
      where: { id, tenantId },
      include: { client: true }
    });
    if (!existingTask) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Consultants can only modify tasks assigned to them or their assigned clients
    if (currentUser.role === 'consultant') {
      const isAssignee = existingTask.assignedTo === currentUser.id;
      const isClientConsultant = existingTask.client?.assignedConsultantId === currentUser.id;
      if (!isAssignee && !isClientConsultant) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const body = await request.json();

    if (body.client_id) {
      const client = await prisma.client.findFirst({
        where: { id: body.client_id, tenantId }
      });
      if (!client) {
        return NextResponse.json({ error: 'Client not found in this tenant' }, { status: 400 });
      }
    }

    if (body.assigned_to) {
      const assignedUser = await prisma.user.findFirst({
        where: { id: body.assigned_to, tenantId }
      });
      if (!assignedUser) {
        return NextResponse.json({ error: 'Assignee not found in this tenant' }, { status: 400 });
      }
    }

    const data: Record<string, unknown> = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.due_date !== undefined) {
      data.dueDate = body.due_date ? new Date(body.due_date) : null;
    }
    if (body.client_id !== undefined) data.clientId = body.client_id || null;
    if (body.assigned_to !== undefined) data.assignedTo = body.assigned_to || null;
    
    const task = await prisma.task.update({
      where: { id, tenantId },
      data
    });

    await logAuditAction({
      tenantId,
      userId: currentUser.id,
      action: 'UPDATE',
      entityType: 'Task',
      entityId: id,
      details: { title: task.title, status: task.status },
    });

    return NextResponse.json({ data: task });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const currentUser = session.user as { tenantId: string; role: string; id: string };
  const tenantId = currentUser.tenantId;

  // Only administrators and operations managers can delete tasks
  if (currentUser.role !== 'administrator' && currentUser.role !== 'operations_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const taskToDelete = await prisma.task.findUnique({
      where: { id, tenantId },
      select: { title: true }
    });

    if (!taskToDelete) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.task.delete({
      where: { id, tenantId }
    });

    await logAuditAction({
      tenantId,
      userId: currentUser.id,
      action: 'DELETE',
      entityType: 'Task',
      entityId: id,
      details: { title: taskToDelete.title },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
