import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { logAuditAction } from '@/lib/auditLogger';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentUser = session.user as any;
  if (currentUser.role !== 'administrator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const tenantId = currentUser.tenantId;
  const { name, description, triggerEvent, steps, requiredPermissions } = await request.json();

  if (!name || !triggerEvent || !steps || steps.length === 0) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 6);

    // Create the custom skill
    const skill = await prisma.skill.create({
      data: {
        tenantId,
        name,
        slug,
        description,
        category: 'general',
        icon: '🔧',
        version: '1.0.0',
        author: 'Custom Built',
        skillDefinition: 'Created via Builder',
        triggers: JSON.stringify([triggerEvent]),
        requiredPermissions: JSON.stringify(requiredPermissions || []),
        isCore: false,
        isPublished: false,
        steps: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          create: steps.map((s: any, idx: number) => ({
            name: s.name,
            stepType: s.stepType,
            stepOrder: idx,
            config: s.config ? JSON.stringify(s.config) : '{}'
          }))
        }
      }
    });

    // Auto-install it for the tenant
    const installation = await prisma.skillInstallation.create({
      data: {
        tenantId,
        skillId: skill.id,
        isActive: true,
        permissions: {
          create: (requiredPermissions || []).map((perm: string) => ({
            permission: perm,
            granted: true,
            allowedRoles: JSON.stringify(['administrator', 'operations_manager']),
            grantedBy: currentUser.id,
          })),
        },
      }
    });

    // Mark a suggestion as accepted if one matches
    const sug = await prisma.skillSuggestion.findFirst({
      where: { tenantId, triggerEvent, status: 'pending' }
    });
    if (sug) {
      await prisma.skillSuggestion.update({
        where: { id: sug.id },
        data: { status: 'accepted' }
      });
    }

    await logAuditAction({
      tenantId,
      userId: currentUser.id,
      action: 'CREATE',
      entityType: 'Skill',
      entityId: skill.id,
      details: { skillName: skill.name, triggerEvent },
    });

    return NextResponse.json({ data: { skill, installation } }, { status: 201 });
  } catch (error: unknown) {
    console.error('Custom skill creation error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
