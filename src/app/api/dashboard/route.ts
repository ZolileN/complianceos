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
    // ── Auto-initialize compliance items for all active clients who don't have them ──
    const activeClients = await prisma.client.findMany({
      where: { tenantId, status: { not: 'inactive' } },
      select: { id: true }
    });

    const clientsWithItems = await prisma.complianceItem.groupBy({
      by: ['clientId'],
      where: { tenantId },
    });

    const clientsWithItemsSet = new Set(clientsWithItems.map(c => c.clientId));
    const uninitializedClients = activeClients.filter(c => !clientsWithItemsSet.has(c.id));

    if (uninitializedClients.length > 0) {
      const defaultItems = [
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

      const toCreate = [];
      for (const c of uninitializedClients) {
        for (const item of defaultItems) {
          toCreate.push({
            clientId: c.id,
            tenantId,
            category: item.category,
            name: item.name,
            status: 'compliant',
            notes: ''
          });
        }
      }
      await prisma.complianceItem.createMany({ data: toCreate });
    }

    const [
      clientsCount,
      activeTasksCount,
      documentsCount,
      overdueTasksCount,
      compliantItemsCount,
      actionRequiredItemsCount,
      criticalItemsCount
    ] = await Promise.all([
      prisma.client.count({ where: { tenantId } }),
      prisma.task.count({ where: { tenantId, status: { not: 'completed' } } }),
      prisma.document.count({ where: { tenantId } }),
      prisma.task.count({ where: { tenantId, status: 'overdue' } }),
      prisma.complianceItem.count({ where: { tenantId, status: { in: ['compliant', 'not_applicable'] } } }),
      prisma.complianceItem.count({ where: { tenantId, status: 'action_required' } }),
      prisma.complianceItem.count({ where: { tenantId, status: 'critical' } })
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
        overdue: overdueTasksCount,
        compliance: {
          compliant: compliantItemsCount,
          action_required: actionRequiredItemsCount,
          critical: criticalItemsCount
        }
      },
      recentClients: recentClients.map(c => ({ ...c, company_name: c.companyName, created_at: c.createdAt })),
      recentTasks: recentTasks.map(t => ({ ...t, due_date: t.dueDate }))
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
