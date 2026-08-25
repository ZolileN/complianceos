/**
 * SARS document classification and field extraction from OCR text.
 * Phase 1A — read-only intelligence; no eFiling integration.
 */

export type SarsDocumentKind =
  | 'ita34'
  | 'vat201_confirmation'
  | 'emp201_confirmation'
  | 'sars_letter'
  | 'efiling_acknowledgement';

export type SarsDocumentCategory =
  | 'sars_assessment'
  | 'sars_submission'
  | 'sars_correspondence';

export type SarsClassification = {
  kind: SarsDocumentKind;
  category: SarsDocumentCategory;
  documentType: string;
};

const KIND_TO_CATEGORY: Record<SarsDocumentKind, SarsDocumentCategory> = {
  ita34: 'sars_assessment',
  vat201_confirmation: 'sars_submission',
  emp201_confirmation: 'sars_submission',
  efiling_acknowledgement: 'sars_submission',
  sars_letter: 'sars_correspondence',
};

const KIND_LABELS: Record<SarsDocumentKind, string> = {
  ita34: 'ITA34 Notice of Assessment',
  vat201_confirmation: 'VAT201 Submission Confirmation',
  emp201_confirmation: 'EMP201 Submission Confirmation',
  efiling_acknowledgement: 'SARS eFiling Acknowledgement',
  sars_letter: 'SARS Correspondence',
};

/** Detect SARS document type from OCR text and optional filename. */
export function classifySarsDocument(text: string, fileName = ''): SarsClassification | null {
  const haystack = `${fileName}\n${text}`.toLowerCase();

  if (
    /ita\s*34|notice\s+of\s+assessment|assessment\s+notice/i.test(haystack) ||
    (/amount\s+assessed/i.test(haystack) && /tax\s*year/i.test(haystack))
  ) {
    return buildClassification('ita34');
  }

  if (
    /vat\s*201|vat201/i.test(haystack) ||
    (/vat\s+return/i.test(haystack) && /submitted|confirmation|reference/i.test(haystack))
  ) {
    return buildClassification('vat201_confirmation');
  }

  if (
    /emp\s*201|emp201/i.test(haystack) ||
    (/paye/i.test(haystack) && /submitted|confirmation|reference/i.test(haystack))
  ) {
    return buildClassification('emp201_confirmation');
  }

  if (
    /efiling|e-filing/i.test(haystack) &&
    /acknowledg|confirmation|submitted\s+successfully/i.test(haystack)
  ) {
    return buildClassification('efiling_acknowledgement');
  }

  if (
    /south\s+african\s+revenue\s+service|\bsars\b/i.test(haystack) &&
    /objection|audit|query|letter|correspondence|reference\s*no/i.test(haystack)
  ) {
    return buildClassification('sars_letter');
  }

  return null;
}

function buildClassification(kind: SarsDocumentKind): SarsClassification {
  return {
    kind,
    category: KIND_TO_CATEGORY[kind],
    documentType: KIND_LABELS[kind],
  };
}

export function categoryForSarsKind(kind: SarsDocumentKind): SarsDocumentCategory {
  return KIND_TO_CATEGORY[kind];
}

/** Extract structured metadata for approved OCR storage. */
export function parseSarsDocumentFields(
  kind: SarsDocumentKind,
  text: string
): Record<string, string> {
  const base: Record<string, string> = {
    document_type: KIND_LABELS[kind],
    sars_document_kind: kind,
  };

  const taxRef = extractFirst(text, [
    /tax\s*reference\s*(?:number|no\.?)?\s*:?\s*(\d{10})/i,
    /taxpayer\s*reference\s*(?:number)?\s*:?\s*(\d{10})/i,
    /\b(9\d{9})\b/,
  ]);
  if (taxRef) base.tax_number = taxRef;

  const vatRef = extractFirst(text, [
    /vat\s*(?:registration\s*)?(?:number|no\.?)\s*:?\s*(\d{10})/i,
    /\b(4\d{9})\b/,
  ]);
  if (vatRef) base.vat_number = vatRef;

  const reference = extractFirst(text, [
    /reference\s*(?:number|no\.?)\s*:?\s*([A-Z0-9\-/]+)/i,
    /submission\s*ref(?:erence)?\s*:?\s*([A-Z0-9\-/]+)/i,
  ]);
  if (reference) base.reference_number = reference;

  const taxYear = extractFirst(text, [/tax\s*year\s*:?\s*(\d{4}\/?\d{0,2})/i, /year\s+of\s+assessment\s*:?\s*(\d{4})/i]);
  if (taxYear) base.tax_year = taxYear.replace('/', '');

  const period = extractFirst(text, [
    /tax\s*period\s*:?\s*([^\n\r]+)/i,
    /period\s*:?\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[^\n\r]*\d{4})/i,
  ]);
  if (period) base.period = period.trim();

  const amount = extractFirst(text, [
    /amount\s+assessed\s*:?\s*R?\s*([\d,]+\.?\d*)/i,
    /total\s+payable\s*:?\s*R?\s*([\d,]+\.?\d*)/i,
  ]);
  if (amount) base.amount_assessed = amount.replace(/,/g, '');

  const dueDate = extractFirst(text, [
    /due\s*date\s*:?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
    /payment\s+due\s*:?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
  ]);
  if (dueDate) base.due_date = dueDate;

  const submittedAt = extractFirst(text, [
    /date\s+submitted\s*:?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
    /submission\s+date\s*:?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
  ]);
  if (submittedAt) base.submission_date = submittedAt;

  const letterType = extractFirst(text, [
    /(audit\s+notification|letter\s+of\s+audit|query|objection|verification)/i,
  ]);
  if (letterType && kind === 'sars_letter') base.letter_type = letterType;

  return base;
}

function extractFirst(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

/** Extract tax and VAT reference numbers from free text (email body, OCR). */
export function extractTaxIdentifiers(text: string): { taxNumbers: string[]; vatNumbers: string[] } {
  const taxNumbers = new Set<string>();
  const vatNumbers = new Set<string>();

  for (const match of text.matchAll(/\b(9\d{9})\b/g)) {
    taxNumbers.add(match[1]);
  }
  for (const match of text.matchAll(/\b(4\d{9})\b/g)) {
    vatNumbers.add(match[1]);
  }

  return {
    taxNumbers: [...taxNumbers],
    vatNumbers: [...vatNumbers],
  };
}

/** Common SARS inbound sender patterns. */
export function isSarsEmailAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  return (
    normalized.includes('@sars.gov.za') ||
    normalized.includes('@sarscustomers.gov.za') ||
    normalized.includes('sars') && normalized.includes('gov.za')
  );
}

/** Whether email subject/body suggests SARS correspondence. */
export function isLikelySarsInbound(fromAddress: string, subject = '', body = ''): boolean {
  if (isSarsEmailAddress(fromAddress)) return true;
  const combined = `${subject}\n${body}`.toLowerCase();
  return (
    /\bsars\b/.test(combined) ||
    /south\s+african\s+revenue\s+service/.test(combined) ||
    /ita\s*34|vat\s*201|emp\s*201|efiling/.test(combined)
  );
}
