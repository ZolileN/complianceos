import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isRbacResponse, requireStaff, requireTenantSession } from '@/lib/rbac';
import { assertWritable, ReadOnlyError, readOnlyResponse } from '@/lib/entitlements';
import { calculateLineTotals, type LineItemInput } from '@/lib/invoicing/calculations';
import { nextDocumentNumber } from '@/lib/invoicing/numbers';

export async function GET(request: NextRequest) {
  const user = await requireTenantSession();
  if (isRbacResponse(user)) return user;
  const forbidden = requireStaff(user);
  if (forbidden) return forbidden;

  const status = request.nextUrl.searchParams.get('status');
  const clientId = request.nextUrl.searchParams.get('client_id');

  const data = await prisma.invoice.findMany({
    where: {
      tenantId: user.tenantId!,
      ...(status ? { status } : {}),
      ...(clientId ? { clientId } : {}),
    },
    include: {
      client: { select: { id: true, companyName: true } },
      lineItems: { orderBy: { sortOrder: 'asc' } },
      payments: { orderBy: { paidAt: 'desc' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
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

  const body = await request.json();
  const { clientId, title, notes, dueDate, lineItems, status, retainerId } = body as {
    clientId?: string;
    title?: string;
    notes?: string;
    dueDate?: string;
    lineItems?: LineItemInput[];
    status?: string;
    retainerId?: string;
  };

  if (!clientId || !lineItems?.length) {
    return NextResponse.json({ error: 'clientId and lineItems required' }, { status: 400 });
  }

  const totals = calculateLineTotals(lineItems);
  const invoiceNumber = await nextDocumentNumber(user.tenantId!, 'invoice');

  const invoice = await prisma.invoice.create({
    data: {
      tenantId: user.tenantId!,
      clientId,
      invoiceNumber,
      title: title || null,
      notes: notes || null,
      status: status || 'draft',
      dueDate: dueDate ? new Date(dueDate) : null,
      issuedAt: status === 'sent' ? new Date() : null,
      subtotalCents: totals.subtotalCents,
      vatCents: totals.vatCents,
      totalCents: totals.totalCents,
      retainerId: retainerId || null,
      createdById: user.id,
      lineItems: {
        create: totals.lineItems.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unitPriceCents: l.unitPriceCents,
          amountCents: l.amountCents,
          sortOrder: l.sortOrder,
        })),
      },
    },
    include: { lineItems: true, client: { select: { companyName: true } } },
  });

  return NextResponse.json({ data: invoice }, { status: 201 });
}
