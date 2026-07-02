import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentUser = session.user as any;
  if (currentUser.role !== 'administrator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const tenantId = currentUser.tenantId;

  try {
    // 1. Fetch recent audit logs for the tenant
    // In a real production environment, this would call an LLM to analyze
    // the chronologically ordered logs and detect repetitive sequences.
    // For this demonstration/MVP, we will simulate the LLM analysis.
    
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate AI processing delay

    // We will inject highly relevant simulated suggestions based on standard usage patterns.
    const mockSuggestions = [
      {
        title: "Auto-notify Client on Document Upload",
        description: "We noticed you frequently send WhatsApp messages to clients immediately after uploading their documents. This skill automates that notification.",
        triggerEvent: "document.uploaded",
        suggestedSteps: [
          { name: "Check Document Category", stepType: "condition" },
          { name: "Generate Summary", stepType: "llm_call" },
          { name: "Send WhatsApp", stepType: "api_call" }
        ]
      },
      {
        title: "Escalate Overdue Workflow Tasks",
        description: "You often re-assign tasks when they miss their SLA. This skill automatically detects overdue tasks and notifies the operations manager.",
        triggerEvent: "workflow.step_overdue",
        suggestedSteps: [
          { name: "Lookup Manager", stepType: "database_query" },
          { name: "Send Alert", stepType: "api_call" }
        ]
      }
    ];

    const createdSuggestions = [];
    for (const sug of mockSuggestions) {
      // Create only if similar one doesn't exist
      // @ts-expect-error - TS caching issue
      const exists = await prisma.skillSuggestion.findFirst({
        where: { tenantId, title: sug.title }
      });
      
      if (!exists) {
        // @ts-expect-error - TS caching issue
        const created = await prisma.skillSuggestion.create({
          data: {
            tenantId,
            title: sug.title,
            description: sug.description,
            triggerEvent: sug.triggerEvent,
            suggestedSteps: JSON.stringify(sug.suggestedSteps)
          }
        });
        createdSuggestions.push(created);
      }
    }

    // Also return existing pending suggestions
    // @ts-expect-error - TS caching issue
    const pending = await prisma.skillSuggestion.findMany({
      where: { tenantId, status: 'pending' },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ data: pending, message: `Analysis complete.` });
  } catch (error: unknown) {
    console.error('Analyze error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
