import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import crypto from 'crypto';
import { logAuditAction } from '@/lib/auditLogger';
import { sendTeamInviteEmail } from '@/lib/email';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = (session.user as { tenantId: string }).tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  try {
    const users = await prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    const mappedUsers = users.map(user => ({
      id: user.id,
      tenant_id: tenantId,
      email: user.email,
      full_name: user.name || 'Unnamed',
      role: user.role,
      created_at: user.createdAt,
    }));

    return NextResponse.json({ data: mappedUsers });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as { tenantId: string; role: string; id: string };
  const tenantId = currentUser.tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  // Only administrators and operations managers can add users
  if (currentUser.role !== 'administrator' && currentUser.role !== 'operations_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { name, email, role } = await request.json();

    if (!name || !email || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Prevent operations manager from creating an administrator
    if (currentUser.role === 'operations_manager' && role === 'administrator') {
      return NextResponse.json({ error: 'Operations managers cannot create administrator accounts' }, { status: 403 });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists with this email' }, { status: 400 });
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        role,
        tenantId,
      }
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 48 * 3600000); // 48 hours

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires
      }
    });

    let appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl && process.env.VERCEL_URL) appUrl = process.env.VERCEL_URL;
    appUrl = appUrl || 'localhost:3000';
    if (!appUrl.startsWith('http')) {
      appUrl = appUrl.includes('localhost') ? `http://${appUrl}` : `https://${appUrl}`;
    }

    const inviteUrl = `${appUrl}/accept-invite?token=${token}&email=${encodeURIComponent(email)}`;

    const emailResult = await sendTeamInviteEmail(email, name, role, inviteUrl);
    
    if (!emailResult.success) {
      console.error('Failed to send team invite email for', email);
    }

    await logAuditAction({
      tenantId,
      userId: currentUser.id,
      action: 'CREATE',
      entityType: 'User',
      entityId: newUser.id,
      details: { email: newUser.email, role: newUser.role },
    });

    return NextResponse.json({
      data: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.name,
        role: newUser.role,
        created_at: newUser.createdAt
      }
    }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
