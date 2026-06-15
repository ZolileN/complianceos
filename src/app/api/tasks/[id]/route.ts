import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

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
    const data: Record<string, unknown> = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.due_date !== undefined) {
      data.dueDate = body.due_date ? new Date(body.due_date) : null;
    }
    if (body.client_id !== undefined) data.clientId = body.client_id || null;
    
    const task = await prisma.task.update({
      where: { id, tenantId },
      data
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
  const currentUser = session.user as { tenantId: string; role: string };
  const tenantId = currentUser.tenantId;

  // Only administrators and operations managers can delete tasks
  if (currentUser.role !== 'administrator' && currentUser.role !== 'operations_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await prisma.task.delete({
      where: { id, tenantId }
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
