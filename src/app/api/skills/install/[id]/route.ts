import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentUser = session.user as any;
  if (currentUser.role !== 'administrator') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { isActive, config } = await request.json();
  const installationId = params.id;

  try {
    const install = await prisma.skillInstallation.findUnique({ where: { id: installationId } });
    if (!install || install.tenantId !== currentUser.tenantId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updated = await prisma.skillInstallation.update({
      where: { id: installationId },
      data: {
        isActive: isActive !== undefined ? isActive : install.isActive,
        config: config !== undefined ? config : install.config
      }
    });

    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
