import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isRbacResponse, requireStaff, requireTenantSession } from '@/lib/rbac';
import { assertWritable, ReadOnlyError, readOnlyResponse } from '@/lib/entitlements';
import { calculateLineTotals, type LineItemInput } from '@/lib/invoicing/calculations';
import { nextDocumentNumber } from '@/lib/invoicing/numbers';

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const user = await requireTenantSession();
  if (isRbacResponse(user)) return user;
  const forbidden = requireStaff(user);
  if (forbidden) return forbidden;

  const { id } = await params;
  const quote = await prisma.quote.findFirst({
    where: { id, tenantId: user.tenantId! },
    include: {
      client: { select: { id: true, companyName: true, email: true } },
      lineItems: { orderBy: { sortOrder: 'asc' } },
    },
  });
  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: quote });
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
  const { status, title, notes, validUntil, lineItems } = body as {
    status?: string;
    title?: string;
    notes?: string;
    validUntil?: string;
    lineItems?: LineItemInput[];
  };

  const existing = await prisma.quote.findFirst({ where: { id, tenantId: user.tenantId! } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (status === 'converted') {
    const quote = await prisma.quote.findFirst({
      where: { id, tenantId: user.tenantId! },
      include: { lineItems: true },
    });
    if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const invoiceNumber = await nextDocumentNumber(user.tenantId!, 'invoice');
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          tenantId: user.tenantId!,
          clientId: quote.clientId,
          invoiceNumber,
          status: 'sent',
          title: quote.title,
          notes: quote.notes,
          subtotalCents: quote.subtotalCents,
          vatCents: quote.vatCents,
          totalCents: quote.totalCents,
          dueDate,
          issuedAt: new Date(),
          quoteId: quote.id,
          createdById: user.id,
          lineItems: {
            create: quote.lineItems.map((l) => ({
              description: l.description,
              quantity: l.quantity,
              unitPriceCents: l.unitPriceCents,
              amountCents: l.amountCents,
              sortOrder: l.sortOrder,
            })),
          },
        },
      });
      await tx.quote.update({
        where: { id: quote.id },
        data: { status: 'converted', convertedInvoiceId: inv.id },
      });
      return inv;
    });

    return NextResponse.json({ data: { quote: { id, status: 'converted' }, invoice } });
  }

  const updateData: Record<string, unknown> = {};
  if (status) updateData.status = status;
  if (title !== undefined) updateData.title = title;
  if (notes !== undefined) updateData.notes = notes;
  if (validUntil !== undefined) updateData.validUntil = validUntil ? new Date(validUntil) : null;

  if (lineItems?.length) {
    const totals = calculateLineTotals(lineItems);
    updateData.subtotalCents = totals.subtotalCents;
    updateData.vatCents = totals.vatCents;
    updateData.totalCents = totals.totalCents;
    await prisma.quoteLineItem.deleteMany({ where: { quoteId: id } });
    await prisma.quoteLineItem.createMany({
      data: totals.lineItems.map((l) => ({
        quoteId: id,
        description: l.description,
        quantity: l.quantity,
        unitPriceCents: l.unitPriceCents,
        amountCents: l.amountCents,
        sortOrder: l.sortOrder,
      })),
    });
  }

  const updated = await prisma.quote.update({
    where: { id },
    data: updateData,
    include: { lineItems: true, client: { select: { companyName: true } } },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: NextRequest, { params }: RouteCtx) {
  const user = await requireTenantSession();
  if (isRbacResponse(user)) return user;
  const forbidden = requireStaff(user);
  if (forbidden) return forbidden;

  const { id } = await params;
  const existing = await prisma.quote.findFirst({ where: { id, tenantId: user.tenantId! } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.quote.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
