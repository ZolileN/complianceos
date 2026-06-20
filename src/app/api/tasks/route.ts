import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { Prisma } from '@prisma/client';
import { logAuditAction } from '@/lib/auditLogger';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as { tenantId: string; role: string; email: string; id: string };
  const tenantId = currentUser.tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const clientId = searchParams.get('client_id');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = (page - 1) * limit;

  const hasClientId = clientId && clientId !== 'null' && clientId !== 'undefined';

  const where: Prisma.TaskWhereInput = {
    tenantId,
    ...(status ? { status } : {}),
    ...(hasClientId ? { clientId } : {}),
  };

  // Role-based restrictions
  if (currentUser.role === 'consultant') {
    where.OR = [
      { assignedTo: currentUser.id },
      { client: { assignedConsultantId: currentUser.id } }
    ];
  } else if (currentUser.role === 'client') {
    where.client = { email: currentUser.email };
  }

  try {
    const data = await prisma.task.findMany({
      where,
      include: {
        client: { select: { id: true, companyName: true } },
        assignee: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    const count = await prisma.task.count({ where });

    const mappedData = data.map(task => ({
      ...task,
      due_date: task.dueDate,
      client: task.client ? { id: task.client.id, company_name: task.client.companyName } : null,
      assignee: task.assignee ? { id: task.assignee.id, full_name: task.assignee.name } : null,
    }));

    return NextResponse.json({ data: mappedData, count });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as { tenantId: string; role: string };
  const tenantId = currentUser.tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  // Clients cannot create tasks
  if (currentUser.role === 'client') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  try {
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

    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description,
        priority: body.priority || 'medium',
        status: body.status || 'new',
        dueDate: body.due_date ? new Date(body.due_date) : null,
        clientId: body.client_id || null,
        assignedTo: body.assigned_to || null,
        tenantId,
      }
    });

    await logAuditAction({
      tenantId,
      userId: (currentUser as any).id,
      action: 'CREATE',
      entityType: 'Task',
      entityId: task.id,
      details: { title: task.title, status: task.status },
    });

    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
