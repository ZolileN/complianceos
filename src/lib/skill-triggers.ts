/* ============================================================
   PraxisOne — Skill Trigger System
   
   Redis-based event bus that connects PraxisOne module events
   (document.uploaded, message.received, etc.) to skill executions.
   ============================================================ */

import { redis } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import { pushTenantLog } from '@/lib/redis';

// ── Event Types ────────────────────────────────────────────

export type SkillEvent =
  | 'document.uploaded'
  | 'document.classified'
  | 'message.received'
  | 'message.sent'
  | 'client.created'
  | 'client.updated'
  | 'task.created'
  | 'task.completed'
  | 'task.overdue'
  | 'workflow.step_advanced'
  | 'workflow.completed'
  | 'compliance.deadline_approaching'
  | 'compliance.status_changed'
  | 'invoice.uploaded'
  | 'meeting.ended'
  | 'manual';

export interface SkillEventPayload {
  tenantId: string;
  event: SkillEvent;
  userId: string;
  userRole: string;
  data: Record<string, unknown>;
  timestamp: string;
}

// ── Constants ──────────────────────────────────────────────

const SKILL_EVENT_QUEUE = 'praxisone:skill_event_queue';

// ── Event Emitter ──────────────────────────────────────────

/**
 * Emit a skill event into the Redis queue.
 * Skills that are registered for this event will be discovered and executed.
 */
export async function emitSkillEvent(
  tenantId: string,
  event: SkillEvent,
  userId: string,
  userRole: string,
  data: Record<string, unknown> = {}
): Promise<void> {
  const payload: SkillEventPayload = {
    tenantId,
    event,
    userId,
    userRole,
    data,
    timestamp: new Date().toISOString(),
  };

  try {
    await redis.lpush(SKILL_EVENT_QUEUE, JSON.stringify(payload));
    await redis.ltrim(SKILL_EVENT_QUEUE, 0, 999); // Cap queue at 1000
    
    await pushTenantLog(
      tenantId,
      `Skill event emitted: ${event}`,
      'skill_event',
      { event, dataKeys: Object.keys(data) }
    );
  } catch (error) {
    console.error(`Failed to emit skill event ${event}:`, error);
  }
}

// ── Event Discovery ────────────────────────────────────────

/**
 * Find all skills registered for a specific event within a tenant.
 * Returns skills that:
 * 1. Have the event in their triggers array
 * 2. Are installed for the tenant
 * 3. Are currently active
 */
export async function findSkillsForEvent(
  tenantId: string,
  event: SkillEvent
): Promise<Array<{ skillSlug: string; skillName: string; skillId: string }>> {
  // Get all active installations for this tenant
  const installations = await prisma.skillInstallation.findMany({
    where: {
      tenantId,
      isActive: true,
    },
    include: {
      skill: {
        select: {
          id: true,
          slug: true,
          name: true,
          triggers: true,
        },
      },
    },
  });

  // Filter to skills that have this event as a trigger
  return installations
    .filter((inst: { skill: { triggers: string } }) => {
      const triggers: string[] = JSON.parse(inst.skill.triggers);
      return triggers.includes(event);
    })
    .map((inst: { skill: { slug: string; name: string; id: string } }) => ({
      skillSlug: inst.skill.slug,
      skillName: inst.skill.name,
      skillId: inst.skill.id,
    }));
}

// ── Queue Processor ────────────────────────────────────────

/**
 * Process pending skill events from the Redis queue.
 * This should be called by a background worker or cron job.
 */
export async function processSkillEventQueue(): Promise<number> {
  let processed = 0;

  // Use dynamic import to avoid circular dependency
  const { executeSkill } = await import('@/lib/skill-engine');

  // Process up to 10 events per batch
  for (let i = 0; i < 10; i++) {
    const raw = await redis.brpop(SKILL_EVENT_QUEUE, 1);
    if (!raw) break;

    try {
      const payload: SkillEventPayload = JSON.parse(raw[1]);
      const matchingSkills = await findSkillsForEvent(payload.tenantId, payload.event);

      for (const skill of matchingSkills) {
        try {
          await executeSkill(skill.skillSlug, {
            tenantId: payload.tenantId,
            userId: payload.userId,
            userRole: payload.userRole,
            triggerEvent: payload.event,
            input: payload.data,
          });
          processed++;
        } catch (error) {
          console.error(`Failed to execute skill ${skill.skillSlug}:`, error);
          await pushTenantLog(
            payload.tenantId,
            `Skill trigger failed: ${skill.skillName} — ${error instanceof Error ? error.message : 'Unknown error'}`,
            'error',
            { skillSlug: skill.skillSlug, event: payload.event }
          );
        }
      }
    } catch (error) {
      console.error('Failed to process skill event:', error);
    }
  }

  return processed;
}

// ── Utility ────────────────────────────────────────────────

/**
 * Get the current depth of the skill event queue.
 */
export async function getSkillEventQueueDepth(): Promise<number> {
  try {
    return await redis.llen(SKILL_EVENT_QUEUE);
  } catch (error) {
    console.error('Failed to get skill event queue depth:', error);
    return 0;
  }
}

/**
 * All supported skill events with human-readable descriptions.
 */
export const SKILL_EVENTS: Record<SkillEvent, string> = {
  'document.uploaded': 'When a document is uploaded',
  'document.classified': 'When a document is auto-classified',
  'message.received': 'When a WhatsApp message is received',
  'message.sent': 'When a WhatsApp message is sent',
  'client.created': 'When a new client is created',
  'client.updated': 'When a client record is updated',
  'task.created': 'When a new task is created',
  'task.completed': 'When a task is marked completed',
  'task.overdue': 'When a task becomes overdue',
  'workflow.step_advanced': 'When a workflow step advances',
  'workflow.completed': 'When a workflow is fully completed',
  'compliance.deadline_approaching': 'When a compliance deadline is within 7 days',
  'compliance.status_changed': 'When a compliance status changes',
  'invoice.uploaded': 'When an invoice document is uploaded',
  'meeting.ended': 'When a meeting ends',
  'manual': 'When manually triggered by a user',
};
