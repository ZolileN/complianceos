import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    // To prevent user enumeration, we return success response
    // but only generate/save a token if the user is found.
    if (!user) {
      return NextResponse.json({ 
        success: true, 
        message: 'If the email matches a registered account, a password reset link has been sent.'
      });
    }

    // Generate token valid for 1 hour
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpires
      }
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const resetUrl = `${appUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email || '')}`;

    console.log(`[PASSWORD RESET DEV PREVIEW] Reset url for ${user.email}: ${resetUrl}`);
    
    // Send email via Resend
    const emailResult = await sendPasswordResetEmail(user.email || email.trim(), resetUrl);
    
    if (!emailResult.success) {
      console.error('Email failed to send, but we will not alert the user to prevent enumeration.');
    }

    return NextResponse.json({
      success: true,
      message: 'If the email matches a registered account, a password reset link has been sent.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error during forgot password';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
