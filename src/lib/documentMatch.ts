/**
 * Pure document-matching helpers. Kept free of server-only imports (Prisma,
 * Redis) so client components can use them without pulling Node built-ins
 * into the browser bundle.
 */

/**
 * Intelligently maps a required document string to an uploaded document.
 * Uses exact specific identifiers (e.g. CoR14.1, VAT101) against document name and OCR data.
 */
export function checkDocumentMatch(
  requiredStr: string,
  document: { name: string; category: string; ocrMetadata?: string | null }
): boolean {
  const req = requiredStr.toLowerCase().replace(/[\s\-_]/g, '');
  const name = (document.name || '').toLowerCase().replace(/[\s\-_]/g, '');

  let ocrType = '';
  try {
    if (document.ocrMetadata) {
      const meta = JSON.parse(document.ocrMetadata);
      ocrType = (meta.document_type || '').toLowerCase().replace(/[\s\-_]/g, '');
    }
  } catch {}

  // 1. CoR Document Intelligence (e.g., CoR14.1, CoR14.3, CoR9.1)
  const corMatch = requiredStr.toLowerCase().match(/cor\s*(\d+(\.\d+[a-z]*)?)/i);
  if (corMatch && document.category === 'cor_document') {
    const specificCor = corMatch[0].toLowerCase().replace(/\s/g, ''); // e.g. "cor14.1a"
    return name.includes(specificCor) || ocrType.includes(specificCor);
  }

  // 2. Specific Form Intelligence (VAT101, ITR14, IRP6, EMP101, UI-8, W.As.2, CoR30.1)
  const formMatch = requiredStr
    .toLowerCase()
    .match(/(vat101|itr14|irp6|emp101|ui-8|ui8|w\.as\.2|was2|cor30\.1)/i);
  if (formMatch) {
    const specificForm = formMatch[1].toLowerCase().replace(/[\s\-_\.]/g, '');
    return name.includes(specificForm) || ocrType.includes(specificForm);
  }

  // 3. Fallback to generic Category matching if no specific form is mentioned
  const mapToCategory = (docStr: string) => {
    const s = docStr.toLowerCase();
    if (s.includes('id') || s.includes('identity')) return 'id_document';
    if (s.includes('ita34') || s.includes('assessment')) return 'sars_assessment';
    if (s.includes('vat201') || s.includes('emp201') || s.includes('efiling') || s.includes('submission confirmation'))
      return 'sars_submission';
    if (s.includes('sars') && (s.includes('letter') || s.includes('query') || s.includes('audit')))
      return 'sars_correspondence';
    if (s.includes('tax') || s.includes('assessment')) return 'tax_certificate';
    if (s.includes('bank') || s.includes('turnover')) return 'bank_statement';
    if (s.includes('cor') || s.includes('annual return')) return 'cor_document';
    if (s.includes('vat registration') || s.includes('vat cert')) return 'vat_certificate';
    if (s.includes('bee') || s.includes('scorecard')) return 'bee_certificate';
    if (s.includes('afs') || s.includes('financials') || s.includes('payroll'))
      return 'financial_statement';
    if (s.includes('mandate') || s.includes('power of attorney')) return 'mandate';
    return 'other';
  };

  const reqCat = mapToCategory(requiredStr);
  if (reqCat === document.category) {
    return true;
  }

  // 4. Exact/Substring Name match fallback
  if (name.includes(req) || req.includes(name)) return true;

  return false;
}
