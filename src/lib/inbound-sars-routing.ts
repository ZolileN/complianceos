import { prisma } from '@/lib/prisma';
import { extractTaxIdentifiers } from '@/lib/sars-document-parsers';
import { normaliseToE164 } from '@/lib/twilio';

export type InboundMatchHints = {
  companyHint?: string | null;
  senderPhone?: string | null;
  senderEmail?: string | null;
  subject?: string | null;
};

/** CIPC enterprise numbers: YYYY/NNNNNN/XX */
export function extractRegistrationNumbers(text: string): string[] {
  const results = new Set<string>();
  for (const match of text.matchAll(/\b(\d{4}\/\d{6}\/\d{2})\b/g)) {
    results.add(match[1]);
  }
  return [...results];
}

/** Pull a company-name hint from subject lines like "RE: ITA34 for Acme (Pty) Ltd". */
export function extractCompanyHintFromSubject(subject: string): string | null {
  const trimmed = subject.trim();
  if (!trimmed) return null;

  const patterns = [
    /\bfor\s+(.+?)(?:\s*[-–—]|$)/i,
    /\bre:\s*(?:sars\s+)?(?:ita\s*34|vat\s*201|emp\s*201)?\s*(?:for\s+)?(.+)/i,
    /\b(?:assessment|notice)\s+(?:for|–|-)\s+(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    const hint = match?.[1]?.trim();
    if (hint && hint.length >= 4 && !/^\d+$/.test(hint)) {
      return hint.replace(/\s*\(.*$/, '').trim();
    }
  }

  const withoutRe = trimmed.replace(/^re:\s*/i, '').trim();
  if (withoutRe.length >= 4 && !/\b(sars|ita|vat|emp)\b/i.test(withoutRe)) {
    return withoutRe;
  }

  return null;
}

function phoneVariants(phone: string): string[] {
  const variants = new Set<string>();
  const stripped = phone.replace(/^\+/, '').trim();
  variants.add(phone);
  variants.add(stripped);
  try {
    variants.add(normaliseToE164(phone));
  } catch {
    // ignore invalid numbers
  }
  if (stripped.startsWith('27') && stripped.length === 11) {
    variants.add(`0${stripped.substring(2)}`);
  }
  if (phone.startsWith('0') && phone.length === 10) {
    variants.add(`+27${phone.substring(1)}`);
    variants.add(`27${phone.substring(1)}`);
  }
  return [...variants].filter(Boolean);
}

/**
 * Attempt to match an inbound message to a client using tax/VAT numbers,
 * registration numbers, sender contact details, or fuzzy company name hints.
 */
export async function matchClientFromInboundText(
  tenantId: string,
  text: string,
  hints: InboundMatchHints = {}
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

  const regNumbers = extractRegistrationNumbers(text);
  if (regNumbers.length > 0) {
    const byReg = await prisma.client.findFirst({
      where: { tenantId, registrationNumber: { in: regNumbers } },
      select: { id: true },
    });
    if (byReg) return byReg.id;
  }

  if (hints.senderEmail) {
    const byEmail = await prisma.client.findFirst({
      where: {
        tenantId,
        email: { equals: hints.senderEmail, mode: 'insensitive' },
      },
      select: { id: true },
    });
    if (byEmail) return byEmail.id;
  }

  if (hints.senderPhone) {
    const phones = phoneVariants(hints.senderPhone);
    const byPhone = await prisma.client.findFirst({
      where: {
        tenantId,
        OR: phones.flatMap((p) => [
          { whatsappNumber: p },
          { phone: p },
        ]),
      },
      select: { id: true },
    });
    if (byPhone) return byPhone.id;
  }

  const subjectHint = hints.subject ? extractCompanyHintFromSubject(hints.subject) : null;
  const hint = (hints.companyHint || subjectHint)?.trim();
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
