import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { executeSkill } from '@/lib/skill-engine';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as { tenantId: string; role: string; id: string };
  const tenantId = currentUser.tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const body = await request.json();
  const { skillSlug, input } = body;

  if (!skillSlug) {
    return NextResponse.json({ error: 'skillSlug is required' }, { status: 400 });
  }

  try {
    const result = await executeSkill(skillSlug, {
      tenantId,
      userId: currentUser.id,
      userRole: currentUser.role,
      triggerEvent: 'manual',
      input: input || {},
    });

    return NextResponse.json({ data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Execution failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
