import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isRbacResponse, requireStaff, requireTenantSession } from '@/lib/rbac';
import { assertWritable, ReadOnlyError, readOnlyResponse } from '@/lib/entitlements';

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const user = await requireTenantSession();
  if (isRbacResponse(user)) return user;
  const forbidden = requireStaff(user);
  if (forbidden) return forbidden;

  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, tenantId: user.tenantId! },
    include: {
      client: { select: { id: true, companyName: true, email: true } },
      lineItems: { orderBy: { sortOrder: 'asc' } },
      payments: { orderBy: { paidAt: 'desc' } },
    },
  });
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: invoice });
}

export async function PATCH(request: NextRequest, { params }: RouteCtx) {
  const user = await requireTenantSession();
  if (isRbacResponse(user)) return user;
  const forbidden = requireStaff(user);
  if (forbidden) return forbidden;

  try {
    await assertWritable(user.tenantId!);
  } catch (err) {
    if (err instanceof ReadOnlyError) return readOnlyResponse(err);
    throw err;
  }

  const { id } = await params;
  const body = await request.json();
  const { status, title, notes, dueDate } = body as {
    status?: string;
    title?: string;
    notes?: string;
    dueDate?: string;
  };

  const existing = await prisma.invoice.findFirst({ where: { id, tenantId: user.tenantId! } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      ...(status ? { status, ...(status === 'sent' && !existing.issuedAt ? { issuedAt: new Date() } : {}) } : {}),
      ...(title !== undefined ? { title } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
    },
    include: { lineItems: true, payments: true },
  });

  return NextResponse.json({ data: updated });
}
