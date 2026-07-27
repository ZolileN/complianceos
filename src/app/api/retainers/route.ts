import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isRbacResponse, requireStaff, requireTenantSession } from '@/lib/rbac';
import { assertWritable, ReadOnlyError, readOnlyResponse } from '@/lib/entitlements';
import { calculateLineTotals } from '@/lib/invoicing/calculations';
import { nextDocumentNumber } from '@/lib/invoicing/numbers';

export async function GET(request: NextRequest) {
  const user = await requireTenantSession();
  if (isRbacResponse(user)) return user;
  const forbidden = requireStaff(user);
  if (forbidden) return forbidden;

  const status = request.nextUrl.searchParams.get('status');
  const clientId = request.nextUrl.searchParams.get('client_id');

  const data = await prisma.retainer.findMany({
    where: {
      tenantId: user.tenantId!,
      ...(status ? { status } : {}),
      ...(clientId ? { clientId } : {}),
    },
    include: { client: { select: { id: true, companyName: true } } },
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
  const { clientId, name, amountCents, billingDay, startDate, description } = body as {
    clientId?: string;
    name?: string;
    amountCents?: number;
    billingDay?: number;
    startDate?: string;
    description?: string;
  };

  if (!clientId || !name || !amountCents) {
    return NextResponse.json({ error: 'clientId, name, amountCents required' }, { status: 400 });
  }

  const retainer = await prisma.retainer.create({
    data: {
      tenantId: user.tenantId!,
      clientId,
      name,
      amountCents,
      billingDay: billingDay || 1,
      startDate: startDate ? new Date(startDate) : new Date(),
      description: description || null,
    },
    include: { client: { select: { companyName: true } } },
  });

  return NextResponse.json({ data: retainer }, { status: 201 });
}

/** Generate invoice from active retainer (manual billing run). */
export async function PUT(request: NextRequest) {
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

  const { retainerId } = (await request.json()) as { retainerId?: string };
  if (!retainerId) {
    return NextResponse.json({ error: 'retainerId required' }, { status: 400 });
  }

  const retainer = await prisma.retainer.findFirst({
    where: { id: retainerId, tenantId: user.tenantId!, status: 'active' },
    include: { client: { select: { companyName: true } } },
  });
  if (!retainer) return NextResponse.json({ error: 'Retainer not found' }, { status: 404 });

  const totals = calculateLineTotals([
    { description: `${retainer.name} — monthly retainer`, quantity: 1, unitPriceCents: retainer.amountCents },
  ]);
  const invoiceNumber = await nextDocumentNumber(user.tenantId!, 'invoice');
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);

  const invoice = await prisma.invoice.create({
    data: {
      tenantId: user.tenantId!,
      clientId: retainer.clientId,
      invoiceNumber,
      title: retainer.name,
      status: 'sent',
      issuedAt: new Date(),
      dueDate,
      subtotalCents: totals.subtotalCents,
      vatCents: totals.vatCents,
      totalCents: totals.totalCents,
      retainerId: retainer.id,
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
    include: { lineItems: true },
  });

  return NextResponse.json({ data: invoice });
}
