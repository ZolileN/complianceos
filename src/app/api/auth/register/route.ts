import { NextRequest, NextResponse } from 'next/server';
import { createTenantWithAdmin } from '@/lib/tenant-provision';

export async function POST(req: NextRequest) {
  try {
    const { email, password, firmName, fullName } = await req.json();

    if (!email || !password || !firmName || !fullName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (
      ['@praxisone.com', '@mlkcomputer.com'].some((d) =>
        email.toLowerCase().endsWith(d)
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

    await createTenantWithAdmin({
      firmName,
      fullName,
      email: email.toLowerCase().trim(),
      password,
      plan: 'starter',
    });

    return NextResponse.json(
      { message: 'Workspace created successfully' },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Registration error:', error);
    const msg = error instanceof Error ? error.message : 'Something went wrong during registration';
    const status = msg.includes('already exists') || msg.includes('Invalid') ? 400 : 500;
    return NextResponse.json(
      {
        error:
          status === 400 ? msg : 'Something went wrong during registration',
      },
      { status }
    );
  }
}
