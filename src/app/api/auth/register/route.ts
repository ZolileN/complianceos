import { NextRequest, NextResponse } from 'next/server';
import { createTenantWithAdmin } from '@/lib/tenant-provision';
import { isTenantPlan } from '@/lib/plans';
import { completePendingSignup } from '@/lib/signup-checkout';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, firmName, fullName, pendingSignupId } = body;

    if (
      ['@praxisone.com', '@mlkcomputer.com'].some((d) =>
        String(email || '').toLowerCase().endsWith(d)
      )
    ) {
      return NextResponse.json(
        {
          error:
            'Registration is restricted for this email domain. Please contact your platform administrator.',
        },
        { status: 400 }
      );
    }

    if (pendingSignupId) {
      const pending = await completePendingSignup(String(pendingSignupId));
      if (pending.email !== String(email).toLowerCase().trim()) {
        return NextResponse.json({ error: 'Email does not match payment session' }, { status: 400 });
      }
      const plan = isTenantPlan(pending.plan) ? pending.plan : 'growth';

      const result = await createTenantWithAdmin({
        firmName: pending.firmName,
        fullName: pending.fullName,
        email: pending.email,
        password,
        plan,
        startActive: true,
      });

      await prisma.pendingSignup.update({
        where: { id: pending.id },
        data: { status: 'completed' },
      });

      return NextResponse.json(
        { message: 'Workspace created successfully', data: result },
        { status: 201 }
      );
    }

    if (!email || !password || !firmName || !fullName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const plan = isTenantPlan(body.plan) ? body.plan : 'starter';
    if (plan !== 'starter') {
      return NextResponse.json(
        {
          error: 'Paid plans require payment before workspace creation',
          code: 'PAYMENT_REQUIRED',
        },
        { status: 400 }
      );
    }

    const result = await createTenantWithAdmin({
      firmName,
      fullName,
      email: email.toLowerCase().trim(),
      password,
      plan: 'starter',
    });

    return NextResponse.json(
      { message: 'Workspace created successfully', data: result },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Registration error:', error);
    const msg = error instanceof Error ? error.message : 'Something went wrong during registration';
    const status =
      msg.includes('already exists') ||
      msg.includes('Invalid') ||
      msg.includes('Payment') ||
      msg.includes('expired')
        ? 400
        : 500;
    return NextResponse.json(
      {
        error: status === 400 ? msg : 'Something went wrong during registration',
      },
      { status }
    );
  }
}
