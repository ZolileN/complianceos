import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isRbacResponse, requireStaff, requireTenantSession } from '@/lib/rbac';

export async function GET() {
  const user = await requireTenantSession();
  if (isRbacResponse(user)) return user;
  const forbidden = requireStaff(user);
  if (forbidden) return forbidden;

  const tenantId = user.tenantId!;

  const [activeRetainers, invoices, retainers] = await Promise.all([
    prisma.retainer.findMany({
      where: { tenantId, status: 'active' },
      select: { amountCents: true },
    }),
    prisma.invoice.findMany({
      where: { tenantId, status: { notIn: ['void', 'draft'] } },
      select: { totalCents: true, amountPaidCents: true, status: true },
    }),
    prisma.retainer.count({ where: { tenantId, status: 'active' } }),
  ]);

  const mrrCents = activeRetainers.reduce((sum, r) => sum + r.amountCents, 0);
  const outstandingCents = invoices.reduce(
    (sum, inv) => sum + Math.max(0, inv.totalCents - inv.amountPaidCents),
    0
  );
  const paidThisMonthStart = new Date();
  paidThisMonthStart.setDate(1);
  paidThisMonthStart.setHours(0, 0, 0, 0);

  const payments = await prisma.invoicePayment.findMany({
    where: {
      paidAt: { gte: paidThisMonthStart },
      invoice: { tenantId },
    },
    select: { amountCents: true },
  });
  const collectedThisMonthCents = payments.reduce((sum, p) => sum + p.amountCents, 0);

  const overdueCount = await prisma.invoice.count({
    where: {
      tenantId,
      status: { in: ['sent', 'partial', 'overdue'] },
      dueDate: { lt: new Date() },
    },
  });

  const quoteCount = await prisma.quote.count({
    where: { tenantId, status: { in: ['draft', 'sent'] } },
  });

  return NextResponse.json({
    data: {
      mrrCents,
      outstandingCents,
      collectedThisMonthCents,
      activeRetainers: retainers,
      overdueInvoices: overdueCount,
      openQuotes: quoteCount,
      invoiceCount: invoices.length,
    },
  });
}
