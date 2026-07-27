/**
 * Compliance monitoring engine — deadline escalation, stakeholder
 * notifications, and skill-event emission.
 */

import { prisma } from '@/lib/prisma';
import { emitSkillEvent } from '@/lib/skill-triggers';
import {
  daysUntil,
  getObligationMeta,
  resolveObligation,
  rollForwardDueDate,
  startOfUtcDay,
} from '@/lib/compliance-catalog';

export type ComplianceItemLike = {
  id: string;
  clientId: string;
  tenantId: string;
  category: string;
  name: string;
  status: string;
  dueDate: Date | null;
};

type NotifyOpts = {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  /** Extra query for dedupe, e.g. item + reason */
  dedupeKey?: string;
};

function complianceLink(clientId: string, itemId: string, dedupeKey?: string): string {
  const params = new URLSearchParams({ tab: 'compliance', item: itemId });
  if (dedupeKey) params.set('n', dedupeKey);
  return `/dashboard/clients/${clientId}?${params.toString()}`;
}

/** Staff recipients: assigned consultant + ops/admin on the tenant */
export async function getComplianceStakeholderIds(
  tenantId: string,
  assignedConsultantId: string | null | undefined
): Promise<string[]> {
  const staff = await prisma.user.findMany({
    where: {
      tenantId,
      OR: [
        ...(assignedConsultantId ? [{ id: assignedConsultantId }] : []),
        { role: { in: ['operations_manager', 'administrator'] } },
      ],
    },
    select: { id: true },
  });
  return [...new Set(staff.map((u) => u.id))];
}

/**
 * Create in-app notifications for consultant + ops/admin.
 * Dedupes same-day notifications with the same link pattern for an item.
 */
export async function notifyComplianceStakeholders(
  item: ComplianceItemLike,
  opts: NotifyOpts,
  assignedConsultantId?: string | null
): Promise<number> {
  let consultantId = assignedConsultantId;
  if (consultantId === undefined) {
    const client = await prisma.client.findUnique({
      where: { id: item.clientId },
      select: { assignedConsultantId: true },
    });
    consultantId = client?.assignedConsultantId ?? null;
  }

  const userIds = await getComplianceStakeholderIds(item.tenantId, consultantId);
  if (userIds.length === 0) return 0;

  const link = complianceLink(item.clientId, item.id, opts.dedupeKey);
  const dayStart = startOfUtcDay();

  let created = 0;
  for (const userId of userIds) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        createdAt: { gte: dayStart },
        OR: [
          { link },
          {
            AND: [
              { link: { contains: `item=${item.id}` } },
              ...(opts.dedupeKey ? [{ link: { contains: `n=${opts.dedupeKey}` } }] : []),
            ],
          },
        ],
      },
    });
    if (existing) continue;

    await prisma.notification.create({
      data: {
        userId,
        title: opts.title,
        message: opts.message,
        type: opts.type || 'warning',
        link,
        read: false,
      },
    });
    created++;
  }
  return created;
}

export async function emitComplianceStatusChanged(
  item: ComplianceItemLike,
  previousStatus: string | null,
  userId = 'system',
  userRole = 'system'
): Promise<void> {
  await emitSkillEvent(item.tenantId, 'compliance.status_changed', userId, userRole, {
    complianceItemId: item.id,
    clientId: item.clientId,
    category: item.category,
    name: item.name,
    previousStatus,
    status: item.status,
    dueDate: item.dueDate?.toISOString() ?? null,
  });
}

export async function emitDeadlineApproaching(
  item: ComplianceItemLike,
  daysRemaining: number
): Promise<void> {
  await emitSkillEvent(item.tenantId, 'compliance.deadline_approaching', 'system', 'system', {
    complianceItemId: item.id,
    clientId: item.clientId,
    category: item.category,
    name: item.name,
    status: item.status,
    dueDate: item.dueDate?.toISOString() ?? null,
    daysRemaining,
  });
}

/**
 * After marking compliant, roll dueDate forward using catalog rules.
 */
export function nextDueAfterCompliant(
  category: string,
  name: string,
  previousDue: Date | null | undefined
): Date | null {
  return rollForwardDueDate(category, name, previousDue);
}

const STATUS_SEVERITY: Record<string, number> = {
  critical: 4,
  action_required: 3,
  compliant: 2,
  not_applicable: 1,
};

function worseStatus(a: string, b: string): string {
  return (STATUS_SEVERITY[a] ?? 0) >= (STATUS_SEVERITY[b] ?? 0) ? a : b;
}

/**
 * Prefer the earliest due date (most urgent). If only one side has a due date, keep it.
 */
function mergeDueDate(
  a: Date | null | undefined,
  b: Date | null | undefined
): Date | null {
  if (a && b) return a.getTime() <= b.getTime() ? a : b;
  return a ?? b ?? null;
}

/**
 * Rename legacy alias rows onto canonical names.
 * When a canonical row already exists, merge alias → canonical (worst status,
 * earliest due date, combined notes) and delete the alias.
 */
export async function migrateAliasComplianceItems(): Promise<{
  renamed: number;
  merged: number;
  skipped: number;
}> {
  const items = await prisma.complianceItem.findMany({
    select: {
      id: true,
      clientId: true,
      tenantId: true,
      category: true,
      name: true,
      status: true,
      dueDate: true,
      notes: true,
      lastChecked: true,
    },
  });

  let renamed = 0;
  let merged = 0;
  const skipped = 0;

  for (const item of items) {
    const resolved = resolveObligation(item.category, item.name);
    if (resolved.category === item.category && resolved.name === item.name) continue;

    // Alias row may already have been deleted in an earlier iteration of this pass
    const stillExists = await prisma.complianceItem.findUnique({
      where: { id: item.id },
      select: { id: true },
    });
    if (!stillExists) continue;

    const conflict = await prisma.complianceItem.findUnique({
      where: {
        clientId_category_name: {
          clientId: item.clientId,
          category: resolved.category,
          name: resolved.name,
        },
      },
    });

    if (conflict) {
      if (conflict.id === item.id) continue;

      const status = worseStatus(conflict.status, item.status);
      const dueDate = mergeDueDate(conflict.dueDate, item.dueDate);
      const notesParts = [conflict.notes, item.notes]
        .map((n) => (n || '').trim())
        .filter(Boolean);
      const notes = notesParts.length
        ? [...new Set(notesParts)].join(' | ')
        : conflict.notes;

      const lastChecked =
        conflict.lastChecked && item.lastChecked
          ? conflict.lastChecked.getTime() >= item.lastChecked.getTime()
            ? conflict.lastChecked
            : item.lastChecked
          : conflict.lastChecked ?? item.lastChecked ?? null;

      await prisma.$transaction(async (tx) => {
        await tx.complianceItem.update({
          where: { id: conflict.id },
          data: {
            status,
            dueDate,
            notes,
            lastChecked,
          },
        });

        // Preserve notification deep links when the alias row is removed.
        const linkedNotifications = await tx.notification.findMany({
          where: { link: { contains: `item=${item.id}` } },
          select: { id: true, link: true },
        });
        for (const notification of linkedNotifications) {
          if (!notification.link) continue;
          await tx.notification.update({
            where: { id: notification.id },
            data: {
              link: notification.link.replace(
                `item=${item.id}`,
                `item=${conflict.id}`
              ),
            },
          });
        }

        await tx.complianceItem.delete({ where: { id: item.id } });
      });
      merged++;
      continue;
    }

    await prisma.complianceItem.update({
      where: { id: item.id },
      data: { category: resolved.category, name: resolved.name },
    });
    renamed++;
  }

  return { renamed, merged, skipped };
}

export type DeadlineCheckResult = {
  scanned: number;
  escalatedCritical: number;
  escalatedAction: number;
  notified: number;
  approachingEvents: number;
  aliases: { renamed: number; merged: number; skipped: number };
};

/**
 * Daily monitor: escalate overdue → critical, approaching → action_required,
 * notify staff, emit skill events.
 */
export async function runComplianceDeadlineCheck(): Promise<DeadlineCheckResult> {
  const aliases = await migrateAliasComplianceItems();
  const today = startOfUtcDay();

  const items = await prisma.complianceItem.findMany({
    where: {
      dueDate: { not: null },
      status: { notIn: ['not_applicable'] },
    },
    include: {
      client: { select: { assignedConsultantId: true, companyName: true } },
    },
  });

  let escalatedCritical = 0;
  let escalatedAction = 0;
  let notified = 0;
  let approachingEvents = 0;

  for (const raw of items) {
    if (!raw.dueDate) continue;

    const resolved = resolveObligation(raw.category, raw.name);
    const meta = getObligationMeta(resolved.category, resolved.name);
    const warnDays = meta?.warnDays ?? 7;
    const remaining = daysUntil(raw.dueDate, today);

    let status = raw.status;
    let changed = false;
    const previousStatus = raw.status;

    // Overdue → critical
    if (remaining < 0 && status !== 'critical') {
      status = 'critical';
      changed = true;
      escalatedCritical++;
    } else if (
      remaining >= 0 &&
      remaining <= warnDays &&
      status === 'compliant'
    ) {
      // Approaching window (7d default, 60d for BEE)
      status = 'action_required';
      changed = true;
      escalatedAction++;
    }

    let item: ComplianceItemLike = {
      id: raw.id,
      clientId: raw.clientId,
      tenantId: raw.tenantId,
      category: resolved.category,
      name: resolved.name,
      status,
      dueDate: raw.dueDate,
    };

    if (changed) {
      const updated = await prisma.complianceItem.update({
        where: { id: raw.id },
        data: {
          status,
          lastChecked: new Date(),
        },
      });
      item = {
        id: updated.id,
        clientId: updated.clientId,
        tenantId: updated.tenantId,
        category: updated.category,
        name: updated.name,
        status: updated.status,
        dueDate: updated.dueDate,
      };

      await emitComplianceStatusChanged(item, previousStatus);

      const company = raw.client.companyName;
      const count = await notifyComplianceStakeholders(
        item,
        {
          title:
            status === 'critical'
              ? `Critical: ${item.name} overdue`
              : `Deadline approaching: ${item.name}`,
          message:
            status === 'critical'
              ? `${company} — ${item.category} / ${item.name} is overdue (due ${raw.dueDate.toISOString().slice(0, 10)}).`
              : `${company} — ${item.category} / ${item.name} is due in ${remaining} day(s) (${raw.dueDate.toISOString().slice(0, 10)}).`,
          type: status === 'critical' ? 'error' : 'warning',
          dedupeKey: status === 'critical' ? 'overdue' : 'approaching',
        },
        raw.client.assignedConsultantId
      );
      notified += count;
    }

    // Approaching event even if already action_required (idempotent notify via dedupe)
    if (remaining >= 0 && remaining <= warnDays) {
      await emitDeadlineApproaching(item, remaining);
      approachingEvents++;

      if (!changed) {
        const company = raw.client.companyName;
        const count = await notifyComplianceStakeholders(
          item,
          {
            title: `Deadline approaching: ${item.name}`,
            message: `${company} — ${item.category} / ${item.name} is due in ${remaining} day(s) (${raw.dueDate.toISOString().slice(0, 10)}).`,
            type: 'warning',
            dedupeKey: 'approaching',
          },
          raw.client.assignedConsultantId
        );
        notified += count;
      }
    }
  }

  return {
    scanned: items.length,
    escalatedCritical,
    escalatedAction,
    notified,
    approachingEvents,
    aliases,
  };
}

/** Shared auth for cron routes */
export function assertCronAuthorized(request: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return new Response(JSON.stringify({ error: 'CRON_SECRET is not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token !== secret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return null;
}
