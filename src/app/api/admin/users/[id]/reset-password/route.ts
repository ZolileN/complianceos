import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  isPlatformAdminResponse,
  requirePlatformAdmin,
} from '@/lib/platform-admin';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePlatformAdmin();
  if (isPlatformAdminResponse(admin)) return admin;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const userToReset = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, tenant: { select: { slug: true } } }
    });

    if (!userToReset) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Do not allow resetting another PraxisOne administrator's password to prevent privilege escalation
    if (['praxisone', 'mlk-computer-consulting'].includes(userToReset.tenant?.slug as string) && userToReset.role === 'administrator') {
      return NextResponse.json({ error: 'Cannot reset other PraxisAdmin passwords.' }, { status: 403 });
    }

    // Generate a secure temporary password
    const temporaryPassword = Math.random().toString(36).slice(-8) + 'Aa1!';
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });

    return NextResponse.json({ 
      success: true, 
      temporaryPassword,
      message: 'Password reset successfully' 
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to reset password';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
