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

    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: email.trim().toLowerCase(),
        token: token,
      }
    });

    if (!verificationToken) {
      return NextResponse.json({ error: 'Invalid invite link or email address.' }, { status: 400 });
    }

    if (verificationToken.expires < new Date()) {
      return NextResponse.json({ error: 'Invite link has expired. Please request a new one from your administrator.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    // Update user password and set email Verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        emailVerified: new Date(),
      }
    });

    // Delete the used token
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verificationToken.identifier,
          token: verificationToken.token,
        }
      }
    });

    return NextResponse.json({ success: true, message: 'Password has been set and account verified successfully.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error during accept invite';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
