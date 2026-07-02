import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const packs = await prisma.businessPack.findMany({
      include: {
        skills: {
          select: { id: true, slug: true, name: true, description: true, icon: true, category: true, rating: true, installCount: true },
        },
        _count: { select: { skills: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ data: packs });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
