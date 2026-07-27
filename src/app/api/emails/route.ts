import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isRbacResponse, requireStaff, requireTenantSession } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  const user = await requireTenantSession();
  if (isRbacResponse(user)) return user;
  const forbidden = requireStaff(user);
  if (forbidden) return forbidden;

  const status = request.nextUrl.searchParams.get('status') || 'unread';
  const q = (request.nextUrl.searchParams.get('q') || '').trim().slice(0, 200);

  const where = {
    tenantId: user.tenantId!,
    ...(status !== 'all' ? { status } : {}),
    ...(q
      ? {
          OR: [
            { fromAddress: { contains: q, mode: 'insensitive' as const } },
            { subject: { contains: q, mode: 'insensitive' as const } },
            { bodyText: { contains: q, mode: 'insensitive' as const } },
            { client: { companyName: { contains: q, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  };

  const data = await prisma.inboundEmail.findMany({
    where,
    include: { client: { select: { id: true, companyName: true } } },
    orderBy: { receivedAt: 'desc' },
    take: 100,
  });

  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest) {
  const user = await requireTenantSession();
  if (isRbacResponse(user)) return user;
  const forbidden = requireStaff(user);
  if (forbidden) return forbidden;

  const { id, status } = (await request.json()) as { id?: string; status?: string };
  if (!id || !status) {
    return NextResponse.json({ error: 'id and status required' }, { status: 400 });
  }

  const updated = await prisma.inboundEmail.updateMany({
    where: { id, tenantId: user.tenantId! },
    data: { status },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
