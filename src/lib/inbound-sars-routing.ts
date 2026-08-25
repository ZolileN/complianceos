import { prisma } from '@/lib/prisma';
import { extractTaxIdentifiers } from '@/lib/sars-document-parsers';

/**
 * Attempt to match an inbound message to a client using tax/VAT numbers
 * or fuzzy company name hints in the text.
 */
export async function matchClientFromInboundText(
  tenantId: string,
  text: string,
  companyHint?: string | null
): Promise<string | null> {
  const { taxNumbers, vatNumbers } = extractTaxIdentifiers(text);

  if (taxNumbers.length > 0) {
    const byTax = await prisma.client.findFirst({
      where: { tenantId, taxNumber: { in: taxNumbers } },
      select: { id: true },
    });
    if (byTax) return byTax.id;
  }

  if (vatNumbers.length > 0) {
    const byVat = await prisma.client.findFirst({
      where: { tenantId, vatNumber: { in: vatNumbers } },
      select: { id: true },
    });
    if (byVat) return byVat.id;
  }

  const hint = companyHint?.trim();
  if (hint && hint.length >= 4) {
    const byName = await prisma.client.findFirst({
      where: {
        tenantId,
        companyName: { contains: hint, mode: 'insensitive' },
      },
      select: { id: true },
    });
    if (byName) return byName.id;
  }

  return null;
}
