import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  if (!userId) {
    return NextResponse.json({ error: 'No user ID in session' }, { status: 400 });
  }

  try {
    let notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    if (notifications.length === 0) {
      await prisma.notification.createMany({
        data: [
          {
            userId,
            title: 'Welcome to complianceOS! 🎉',
            message: 'Start by completing your personal profile and security setup.',
            type: 'success',
            link: '/dashboard/settings?tab=personal',
            read: false,
          },
          {
            userId,
            title: 'Action Required: SARS Compliance ⚠️',
            message: 'A compliance verification check for client tax status is pending.',
            type: 'warning',
            link: '/dashboard/compliance',
            read: false,
          },
          {
            userId,
            title: 'New Task Assigned 📋',
            message: 'You have been assigned to verify FICA document uploads.',
            type: 'info',
            link: '/dashboard/tasks',
            read: false,
          }
        ]
      });

      notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    }

    return NextResponse.json({ data: notifications });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error fetching notifications';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  if (!userId) {
    return NextResponse.json({ error: 'No user ID in session' }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { id, all } = body;

    if (id) {
      const updated = await prisma.notification.updateMany({
        where: { id, userId },
        data: { read: true },
      });
      return NextResponse.json({ success: true, count: updated.count });
    } else if (all) {
      const updated = await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });
      return NextResponse.json({ success: true, count: updated.count });
    }

    return NextResponse.json({ error: 'Missing id or all parameter' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error updating notifications';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
