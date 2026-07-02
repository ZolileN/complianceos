import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { getAvailableSkills } from '@/lib/skill-engine';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as { tenantId: string; role: string; id: string };
  const tenantId = currentUser.tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const installed = searchParams.get('installed');

  try {
    const skills = await getAvailableSkills(tenantId);

    let filtered = skills;
    if (category) filtered = filtered.filter((s) => (s as { category?: string }).category === category);
    if (installed === 'true') filtered = filtered.filter((s) => s.installed);
    if (installed === 'false') filtered = filtered.filter((s) => !s.installed);

    return NextResponse.json({ data: filtered });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as { tenantId: string; role: string; id: string };
  if (currentUser.role !== 'administrator') {
    return NextResponse.json({ error: 'Only administrators can create skills' }, { status: 403 });
  }

  const body = await request.json();
  try {
    const skill = await prisma.skill.create({
      data: {
        slug: body.slug,
        name: body.name,
        description: body.description,
        category: body.category || 'general',
        icon: body.icon || '⚡',
        skillDefinition: body.skillDefinition || '',
        triggers: JSON.stringify(body.triggers || []),
        requiredPermissions: JSON.stringify(body.requiredPermissions || []),
        isPublished: body.isPublished ?? false,
      },
    });

    return NextResponse.json({ data: skill }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
