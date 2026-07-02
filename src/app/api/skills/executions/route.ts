import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getExecutionHistory } from '@/lib/skill-engine';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as { tenantId: string; role: string };
  const tenantId = currentUser.tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  try {
    const executions = await getExecutionHistory(tenantId, 100);

    interface ExecutionRecord {
      id: string;
      skill: { name: string; slug: string; icon: string; category: string };
      status: string;
      triggerEvent: string;
      triggeredBy: string;
      stepsCompleted: number;
      totalSteps: number;
      tokensUsed: number;
      durationMs: number | null;
      error: string | null;
      createdAt: Date;
      completedAt: Date | null;
    }

    const mapped = executions.map((ex: ExecutionRecord) => ({
      id: ex.id,
      skillName: ex.skill.name,
      skillSlug: ex.skill.slug,
      skillIcon: ex.skill.icon,
      skillCategory: ex.skill.category,
      status: ex.status,
      triggerEvent: ex.triggerEvent,
      triggeredBy: ex.triggeredBy,
      stepsCompleted: ex.stepsCompleted,
      totalSteps: ex.totalSteps,
      tokensUsed: ex.tokensUsed,
      durationMs: ex.durationMs,
      error: ex.error,
      createdAt: ex.createdAt,
      completedAt: ex.completedAt,
    }));

    return NextResponse.json({ data: mapped });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
