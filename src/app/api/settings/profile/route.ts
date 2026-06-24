import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import bcrypt from 'bcryptjs';

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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        contactNumber: true,
        createdAt: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error fetching user profile';
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
    const body = await request.json();
    const { name, email, contactNumber, image, currentPassword, newPassword } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if email is already taken by another user
    const existing = await prisma.user.findFirst({
      where: {
        email: email.trim(),
        NOT: { id: userId }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Email is already in use by another account.' }, { status: 409 });
    }

    const updateData: {
      name: string;
      email: string;
      contactNumber: string | null;
      image: string | null;
      password?: string;
    } = {
      name: name.trim(),
      email: email.trim(),
      contactNumber: contactNumber?.trim() || null,
      image: image?.trim() || null,
    };

    if (currentPassword && newPassword) {
      if (newPassword.trim().length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters long.' }, { status: 400 });
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { password: true }
      });

      if (!dbUser || !dbUser.password) {
        return NextResponse.json({ error: 'User password not found.' }, { status: 404 });
      }

      const isCurrentValid = await bcrypt.compare(currentPassword, dbUser.password);
      if (!isCurrentValid) {
        return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
      }

      updateData.password = await bcrypt.hash(newPassword.trim(), 10);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        contactNumber: true,
        createdAt: true,
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error updating user profile';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
