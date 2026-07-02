import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentUser = session.user as any;
  if (currentUser.role !== 'administrator') {
    return NextResponse.json({ error: 'Only administrators can rate skills' }, { status: 403 });
  }

  const { rating, comment } = await request.json();
  const skillId = params.id;

  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be a number between 1 and 5' }, { status: 400 });
  }

  try {
    const tenantId = currentUser.tenantId;

    // Verify skill exists
    const skill = await prisma.skill.findUnique({ where: { id: skillId } });
    if (!skill) return NextResponse.json({ error: 'Skill not found' }, { status: 404 });

    // Verify installation exists (can only rate installed skills)
    const install = await prisma.skillInstallation.findUnique({
      where: { tenantId_skillId: { tenantId, skillId } }
    });
    if (!install) {
      return NextResponse.json({ error: 'You must install the skill before rating it' }, { status: 403 });
    }

    // Upsert review
    const review = await prisma.skillReview.upsert({
      where: {
        tenantId_skillId: { tenantId, skillId }
      },
      update: {
        rating,
        comment
      },
      create: {
        tenantId,
        skillId,
        rating,
        comment
      }
    });

    // Recalculate average rating
    const aggregations = await prisma.skillReview.aggregate({
      where: { skillId },
      _avg: { rating: true }
    });

    const newAverage = aggregations._avg.rating || 0;

    await prisma.skill.update({
      where: { id: skillId },
      data: { rating: newAverage }
    });

    return NextResponse.json({ data: review });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
