import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { SKILL_EVENTS, type SkillEvent } from '@/lib/skill-triggers';

const HEURISTIC_SUGGESTIONS: Array<{
  title: string;
  description: string;
  triggerEvent: SkillEvent;
  suggestedSteps: Array<{ name: string; stepType: string }>;
}> = [
  {
    title: 'Auto-notify Client on Document Upload',
    description:
      'Send a WhatsApp confirmation when a document is uploaded for a client.',
    triggerEvent: 'document.uploaded',
    suggestedSteps: [
      { name: 'Check Document Category', stepType: 'condition' },
      { name: 'Generate Summary', stepType: 'llm_call' },
      { name: 'Send WhatsApp', stepType: 'api_call' },
    ],
  },
  {
    title: 'Welcome New Clients Automatically',
    description:
      'Send a welcome message when a new client record is created.',
    triggerEvent: 'client.created',
    suggestedSteps: [
      { name: 'Lookup Client Contact', stepType: 'database_query' },
      { name: 'Send Welcome WhatsApp', stepType: 'api_call' },
    ],
  },
  {
    title: 'Alert on Task Completion',
    description:
      'Notify the operations manager when a high-priority task is completed.',
    triggerEvent: 'task.completed',
    suggestedSteps: [
      { name: 'Check Task Priority', stepType: 'condition' },
      { name: 'Notify Manager', stepType: 'api_call' },
    ],
  },
  {
    title: 'Follow Up After Outbound Message',
    description:
      'Create a follow-up task when a WhatsApp message is sent to a client.',
    triggerEvent: 'message.sent',
    suggestedSteps: [
      { name: 'Create Follow-up Task', stepType: 'database_query' },
      { name: 'Set Due Date', stepType: 'condition' },
    ],
  },
];

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as { role: string; tenantId: string };
  if (currentUser.role !== 'administrator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const tenantId = currentUser.tenantId;

  try {
    const installations = await prisma.skillInstallation.findMany({
      where: { tenantId, isActive: true },
      include: {
        skill: { select: { triggers: true } },
      },
    });

    const coveredTriggers = new Set<string>();
    for (const inst of installations) {
      try {
        const triggers: string[] = JSON.parse(inst.skill.triggers);
        triggers.forEach((t) => coveredTriggers.add(t));
      } catch {
        // ignore malformed trigger JSON
      }
    }

    const createdSuggestions = [];
    for (const sug of HEURISTIC_SUGGESTIONS) {
      if (coveredTriggers.has(sug.triggerEvent)) continue;

      const exists = await prisma.skillSuggestion.findFirst({
        where: { tenantId, title: sug.title },
      });

      if (!exists) {
        const created = await prisma.skillSuggestion.create({
          data: {
            tenantId,
            title: sug.title,
            description: sug.description,
            triggerEvent: sug.triggerEvent,
            suggestedSteps: JSON.stringify(sug.suggestedSteps),
          },
        });
        createdSuggestions.push(created);
      }
    }

    const pending = await prisma.skillSuggestion.findMany({
      where: { tenantId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });

    const source =
      createdSuggestions.length > 0 || pending.length > 0 ? 'database' : 'heuristic';

    return NextResponse.json({
      data: pending,
      source,
      message: `Analysis complete. ${createdSuggestions.length} new suggestion(s) added.`,
      coveredTriggers: Array.from(coveredTriggers),
      availableEvents: Object.keys(SKILL_EVENTS),
    });
  } catch (error: unknown) {
    console.error('Analyze error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
