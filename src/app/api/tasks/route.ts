import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = (session.user as { tenantId: string }).tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const clientId = searchParams.get('client_id');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = (page - 1) * limit;

  const hasClientId = clientId && clientId !== 'null' && clientId !== 'undefined';

  const where = {
    tenantId,
    ...(status ? { status } : {}),
    ...(hasClientId ? { clientId } : {}),
  };

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

  const tenantId = (session.user as { tenantId: string }).tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const body = await request.json();
  try {
    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description,
        priority: body.priority || 'medium',
        status: body.status || 'new',
        dueDate: body.due_date ? new Date(body.due_date) : null,
        clientId: body.client_id || null,
        tenantId,
      }
    });
    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
