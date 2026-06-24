import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { AdminLogger } from '@/lib/admin-logs';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== 'administrator') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 });
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: { isActive }
    });

    AdminLogger.log(
      'system',
      `Tenant "${tenant.name}" (${tenant.slug}) status updated to ${isActive ? 'ACTIVE' : 'SUSPENDED'}`,
      { tenantId: id, isActive }
    );

    return NextResponse.json({ success: true, data: tenant });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to update tenant';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
