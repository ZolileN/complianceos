import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isRbacResponse, requireStaff, requireTenantSession } from '@/lib/rbac';
import { assertWritable, ReadOnlyError, readOnlyResponse } from '@/lib/entitlements';

type RouteCtx = { params: Promise<{ id: string }> };

function deriveInvoiceStatus(totalCents: number, amountPaidCents: number, current: string): string {
  if (current === 'void' || current === 'draft') return current;
  if (amountPaidCents >= totalCents) return 'paid';
  if (amountPaidCents > 0) return 'partial';
  return current === 'sent' ? 'sent' : current;
}

export async function POST(request: NextRequest, { params }: RouteCtx) {
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
  const { amountCents, method, reference, notes, paidAt } = body as {
    amountCents?: number;
    method?: string;
    reference?: string;
    notes?: string;
    paidAt?: string;
  };

  if (!amountCents || amountCents <= 0) {
    return NextResponse.json({ error: 'amountCents required' }, { status: 400 });
  }

  const invoice = await prisma.invoice.findFirst({ where: { id, tenantId: user.tenantId! } });
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await prisma.$transaction(async (tx) => {
    await tx.invoicePayment.create({
      data: {
        invoiceId: id,
        amountCents,
        method: method || 'manual',
        reference: reference || null,
        notes: notes || null,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        recordedById: user.id,
      },
    });

    const newPaid = invoice.amountPaidCents + amountCents;
    const status = deriveInvoiceStatus(invoice.totalCents, newPaid, invoice.status);

    return tx.invoice.update({
      where: { id },
      data: {
        amountPaidCents: newPaid,
        status,
        paidAt: status === 'paid' ? new Date() : invoice.paidAt,
      },
      include: { payments: true, lineItems: true },
    });
  });

  return NextResponse.json({ data: updated });
}
