import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { token, email, password } = await request.json();

    if (!token || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: {
        email: email.trim().toLowerCase(),
        resetToken: token,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid reset link or email address.' }, { status: 400 });
    }

    if (!user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      return NextResponse.json({ error: 'Password reset link has expired. Please request a new one.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      }
    });

    return NextResponse.json({ success: true, message: 'Password has been reset successfully.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error during password reset';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
