import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import bcrypt from 'bcryptjs';
import { logAuditAction } from '@/lib/auditLogger';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as { tenantId: string; role: string; id: string };
  const tenantId = currentUser.tenantId;

  // Only administrators can update users / reset passwords
  if (currentUser.role !== 'administrator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Check if user belongs to the same tenant
    const targetUser = await prisma.user.findFirst({
      where: { id, tenantId }
    });
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.password !== undefined) {
      if (typeof body.password !== 'string' || body.password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }
      data.password = await bcrypt.hash(body.password, 10);
    }

    if (body.name !== undefined) data.name = body.name;
    if (body.role !== undefined) data.role = body.role;

    const updatedUser = await prisma.user.update({
      where: { id },
      data
    });

    await logAuditAction({
      tenantId,
      userId: currentUser.id,
      action: 'UPDATE',
      entityType: 'User',
      entityId: id,
      details: { email: updatedUser.email, role: updatedUser.role, passwordChanged: body.password !== undefined },
    });

    return NextResponse.json({
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        full_name: updatedUser.name,
        role: updatedUser.role,
        created_at: updatedUser.createdAt
      }
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as { tenantId: string; role: string; id: string };
  const tenantId = currentUser.tenantId;

  if (currentUser.role !== 'administrator' && currentUser.role !== 'operations_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Prevent self-deletion
  if (id === currentUser.id) {
    return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
  }

  try {
    // Check if user belongs to same tenant
    const targetUser = await prisma.user.findFirst({
      where: { id, tenantId }
    });
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Prevent operations manager from deleting administrator
    if (currentUser.role === 'operations_manager' && targetUser.role === 'administrator') {
      return NextResponse.json({ error: 'Operations managers cannot delete administrators' }, { status: 403 });
    }

    await prisma.user.delete({
      where: { id }
    });

    await logAuditAction({
      tenantId,
      userId: currentUser.id,
      action: 'DELETE',
      entityType: 'User',
      entityId: id,
      details: { email: targetUser.email, role: targetUser.role },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
