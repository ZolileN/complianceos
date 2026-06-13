import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = (session.user as { tenantId: string }).tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  try {
    const data = await prisma.workflowTemplate.findMany({
      where: { tenantId },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ data });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = (session.user as { tenantId: string }).tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const { name, description, category, steps } = await request.json();

  try {
    const template = await prisma.workflowTemplate.create({
      data: {
        name,
        description,
        category,
        tenantId,
        steps: {
          create: steps && Array.isArray(steps) ? steps.map((s: { name: string; sla_days?: number }, i: number) => ({
            name: s.name,
            stepOrder: i + 1,
            slaDays: s.sla_days || 3,
          })) : []
        }
      },
      include: { steps: true }
    });

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
