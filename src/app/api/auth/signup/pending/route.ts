import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** Return safe prefill fields for a paid pending signup session. */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing pending signup id' }, { status: 400 });
  }

  const pending = await prisma.pendingSignup.findUnique({
    where: { id },
    select: {
      id: true,
      plan: true,
      firmName: true,
      fullName: true,
      email: true,
      status: true,
      expiresAt: true,
    },
  });

  if (!pending) {
    return NextResponse.json({ error: 'Signup session not found' }, { status: 404 });
  }

  if (pending.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Signup session expired' }, { status: 410 });
  }

  return NextResponse.json({
    data: {
      pendingSignupId: pending.id,
      plan: pending.plan,
      firmName: pending.firmName,
      fullName: pending.fullName,
      email: pending.email,
      paid: pending.status === 'paid' || pending.status === 'completed',
    },
  });
}
