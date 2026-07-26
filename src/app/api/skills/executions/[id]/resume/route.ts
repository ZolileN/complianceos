import { NextRequest, NextResponse } from 'next/server';
import {
  PlanLimitError,
  ReadOnlyError,
  planLimitResponse,
  readOnlyResponse,
} from '@/lib/entitlements';
import {
  isRbacResponse,
  requireManager,
  requireTenantSession,
} from '@/lib/rbac';
import {
  resumeSkillExecution,
  SkillResumeError,
} from '@/lib/skill-engine';

/**
 * POST /api/skills/executions/[id]/resume
 * Body: { decision: 'approve' | 'reject', reason?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireTenantSession();
  if (isRbacResponse(user)) return user;

  const forbidden = requireManager(user);
  if (forbidden) return forbidden;

  let body: { decision?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const decision = body.decision;
  if (decision !== 'approve' && decision !== 'reject') {
    return NextResponse.json(
      { error: "decision must be 'approve' or 'reject'" },
      { status: 400 }
    );
  }

  try {
    const result = await resumeSkillExecution(id, {
      tenantId: user.tenantId!,
      userId: user.id,
      userRole: String(user.role),
      decision,
      reason: body.reason,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof PlanLimitError) return planLimitResponse(err);
    if (err instanceof ReadOnlyError) return readOnlyResponse(err);
    if (err instanceof SkillResumeError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status }
      );
    }
    const message = err instanceof Error ? err.message : 'Resume failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
