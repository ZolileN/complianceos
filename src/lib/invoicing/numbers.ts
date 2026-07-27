import { prisma } from '@/lib/prisma';

type DocType = 'quote' | 'invoice';

export async function nextDocumentNumber(
  tenantId: string,
  type: DocType,
  year = new Date().getFullYear()
): Promise<string> {
  const prefix = type === 'quote' ? 'Q' : 'INV';
  const pattern = `${prefix}-${year}-`;

  if (type === 'quote') {
    const latest = await prisma.quote.findFirst({
      where: { tenantId, quoteNumber: { startsWith: pattern } },
      orderBy: { quoteNumber: 'desc' },
      select: { quoteNumber: true },
    });
    const seq = latest ? parseInt(latest.quoteNumber.split('-').pop() || '0', 10) + 1 : 1;
    return `${pattern}${String(seq).padStart(4, '0')}`;
  }

  const latest = await prisma.invoice.findFirst({
    where: { tenantId, invoiceNumber: { startsWith: pattern } },
    orderBy: { invoiceNumber: 'desc' },
    select: { invoiceNumber: true },
  });
  const seq = latest ? parseInt(latest.invoiceNumber.split('-').pop() || '0', 10) + 1 : 1;
  return `${pattern}${String(seq).padStart(4, '0')}`;
}
