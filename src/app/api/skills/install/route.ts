import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { logAuditAction } from '@/lib/auditLogger';
import {
  requireAiFeature,
  PlanLimitError,
  ReadOnlyError,
  planLimitResponse,
  readOnlyResponse,
} from '@/lib/entitlements';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as { tenantId: string; role: string; id: string };
  const tenantId = currentUser.tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  if (currentUser.role !== 'administrator') {
    return NextResponse.json({ error: 'Only administrators can install skills' }, { status: 403 });
  }

  try {
    await requireAiFeature(tenantId);
  } catch (err) {
    if (err instanceof PlanLimitError) return planLimitResponse(err);
    if (err instanceof ReadOnlyError) return readOnlyResponse(err);
    throw err;
  }

  const body = await request.json();
  const { skillId } = body;

  if (!skillId) return NextResponse.json({ error: 'skillId is required' }, { status: 400 });

  try {
    const skill = await prisma.skill.findUnique({ where: { id: skillId } });
    if (!skill) return NextResponse.json({ error: 'Skill not found' }, { status: 404 });

    const requiredPerms: string[] = JSON.parse(skill.requiredPermissions);

    const installation = await prisma.skillInstallation.create({
      data: {
        tenantId,
        skillId,
        isActive: true,
        permissions: {
          create: requiredPerms.map((perm) => ({
            permission: perm,
            granted: true,
            allowedRoles: JSON.stringify(['administrator', 'operations_manager', 'consultant']),
            grantedBy: currentUser.id,
          })),
        },
      },
      include: { permissions: true },
    });

    // Increment install count
    await prisma.skill.update({
      where: { id: skillId },
      data: { installCount: { increment: 1 } },
    });

    await logAuditAction({
      tenantId,
      userId: currentUser.id,
      action: 'CREATE',
      entityType: 'SkillInstallation',
      entityId: installation.id,
      details: { skillId: skill.id, skillName: skill.name },
    });

    return NextResponse.json({ data: installation }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Install failed';
    if (message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Skill already installed' }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as { tenantId: string; role: string; id: string };
  const tenantId = currentUser.tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  if (currentUser.role !== 'administrator') {
    return NextResponse.json({ error: 'Only administrators can uninstall skills' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const skillId = searchParams.get('skillId');
  if (!skillId) return NextResponse.json({ error: 'skillId is required' }, { status: 400 });

  try {
    await prisma.skillInstallation.delete({
      where: { tenantId_skillId: { tenantId, skillId } },
    });

    await prisma.skill.update({
      where: { id: skillId },
      data: { installCount: { decrement: 1 } },
    });

    await logAuditAction({
      tenantId,
      userId: currentUser.id,
      action: 'DELETE',
      entityType: 'SkillInstallation',
      entityId: skillId,
      details: { skillId },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
