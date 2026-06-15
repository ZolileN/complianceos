import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = (session.user as { tenantId: string }).tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  try {
    const [clientsCount, activeTasksCount, documentsCount, overdueTasksCount] = await Promise.all([
      prisma.client.count({ where: { tenantId } }),
      prisma.task.count({ where: { tenantId, status: { not: 'completed' } } }),
      prisma.document.count({ where: { tenantId } }),
      prisma.task.count({ where: { tenantId, status: 'overdue' } })
    ]);

    const recentClients = await prisma.client.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, companyName: true, status: true, createdAt: true }
    });

    const recentTasks = await prisma.task.findMany({
      where: { tenantId, status: { not: 'completed' } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, title: true, status: true, priority: true, dueDate: true }
    });

    return NextResponse.json({
      stats: {
        clients: clientsCount,
        tasks: activeTasksCount,
        documents: documentsCount,
        overdue: overdueTasksCount
      },
      recentClients: recentClients.map(c => ({ ...c, company_name: c.companyName, created_at: c.createdAt })),
      recentTasks: recentTasks.map(t => ({ ...t, due_date: t.dueDate }))
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
