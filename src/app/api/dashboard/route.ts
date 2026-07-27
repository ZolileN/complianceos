import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { seedComplianceRows } from '@/lib/compliance-catalog';
import { startOfUtcDay } from '@/lib/compliance-catalog';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as { tenantId: string; role: string; id: string; email: string };
  const tenantId = currentUser.tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const clientWhere: Prisma.ClientWhereInput = { tenantId };
  const nestedClientWhere: { tenantId: string; client?: Prisma.ClientWhereInput } = { tenantId };
  if (currentUser.role === 'consultant') {
    clientWhere.assignedConsultantId = currentUser.id;
    nestedClientWhere.client = { assignedConsultantId: currentUser.id };
  }

  try {
    const activeClients = await prisma.client.findMany({
      where: { ...clientWhere, status: { not: 'inactive' } },
      select: { id: true },
    });

    const clientsWithItems = await prisma.complianceItem.groupBy({
      by: ['clientId'],
      where: nestedClientWhere,
    });

    const clientsWithItemsSet = new Set(clientsWithItems.map((c) => c.clientId));
    const uninitializedClients = activeClients.filter((c) => !clientsWithItemsSet.has(c.id));

    if (uninitializedClients.length > 0) {
      const toCreate = uninitializedClients.flatMap((c) => seedComplianceRows(c.id, tenantId));
      await prisma.complianceItem.createMany({ data: toCreate });
    }

    const today = startOfUtcDay();
    const weekEnd = new Date(today);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const [
      clientsCount,
      activeTasksCount,
      documentsCount,
      overdueTasksCount,
      compliantItemsCount,
      actionRequiredItemsCount,
      criticalItemsCount,
      portfolioClients,
      criticalDeadlinesThisWeek,
    ] = await Promise.all([
      prisma.client.count({ where: clientWhere }),
      prisma.task.count({ where: { ...nestedClientWhere, status: { not: 'completed' } } }),
      prisma.document.count({ where: nestedClientWhere }),
      prisma.task.count({
        where: { ...nestedClientWhere, status: { not: 'completed' }, dueDate: { lt: new Date() } },
      }),
      prisma.complianceItem.count({
        where: { ...nestedClientWhere, status: { in: ['compliant', 'not_applicable'] } },
      }),
      prisma.complianceItem.count({ where: { ...nestedClientWhere, status: 'action_required' } }),
      prisma.complianceItem.count({ where: { ...nestedClientWhere, status: 'critical' } }),
      prisma.client.findMany({
        where: { ...clientWhere, status: { not: 'inactive' } },
        select: {
          id: true,
          complianceItems: {
            where: { status: { not: 'not_applicable' } },
            select: { status: true },
          },
        },
      }),
      prisma.complianceItem.count({
        where: {
          ...nestedClientWhere,
          status: 'critical',
          OR: [
            { dueDate: { lt: today } },
            { dueDate: { gte: today, lte: weekEnd } },
          ],
        },
      }),
    ]);

    let clientsCompliant = 0;
    let clientsNeedAction = 0;
    let clientsCritical = 0;

    for (const c of portfolioClients) {
      const statuses = c.complianceItems.map((i) => i.status);
      if (statuses.length === 0) continue;
      if (statuses.some((s) => s === 'critical')) {
        clientsCritical++;
      } else if (statuses.some((s) => s === 'action_required')) {
        clientsNeedAction++;
      } else {
        clientsCompliant++;
      }
    }

    const recentClients = await prisma.client.findMany({
      where: clientWhere,
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, companyName: true, status: true, createdAt: true },
    });

    const recentTasks = await prisma.task.findMany({
      where: { ...nestedClientWhere, status: { not: 'completed' } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, title: true, status: true, priority: true, dueDate: true },
    });

    const complianceIssues = await prisma.complianceItem.findMany({
      where: { ...nestedClientWhere, status: { in: ['action_required', 'critical'] } },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: { client: { select: { id: true, companyName: true } } },
    });

    const tenantRecord = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, name: true },
    });

    return NextResponse.json({
      tenant: tenantRecord ? { slug: tenantRecord.slug, name: tenantRecord.name } : null,
      stats: {
        clients: clientsCount,
        tasks: activeTasksCount,
        documents: documentsCount,
        overdue: overdueTasksCount,
        compliance: {
          compliant: compliantItemsCount,
          action_required: actionRequiredItemsCount,
          critical: criticalItemsCount,
        },
        portfolio: {
          clients_compliant: clientsCompliant,
          clients_need_action: clientsNeedAction,
          clients_critical: clientsCritical,
          critical_deadlines_this_week: criticalDeadlinesThisWeek,
        },
      },
      recentClients: recentClients.map((c) => ({
        ...c,
        company_name: c.companyName,
        created_at: c.createdAt,
      })),
      recentTasks: recentTasks.map((t) => {
        const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed';
        return {
          ...t,
          due_date: t.dueDate,
          status: isOverdue ? 'overdue' : t.status,
        };
      }),
      complianceIssues: complianceIssues.map((i) => ({
        id: i.id,
        client_id: i.clientId,
        company_name: i.client.companyName,
        category: i.category,
        name: i.name,
        status: i.status,
        due_date: i.dueDate,
      })),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
