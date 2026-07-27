export type LineItemInput = {
  description: string;
  quantity: number;
  unitPriceCents: number;
};

export type LineTotals = {
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  lineItems: Array<LineItemInput & { amountCents: number; sortOrder: number }>;
};

/** VAT-inclusive line totals (15% SA VAT applied to subtotal). */
export function calculateLineTotals(
  lines: LineItemInput[],
  vatRate = 0.15
): LineTotals {
  const lineItems = lines.map((line, index) => {
    const amountCents = Math.round(line.quantity * line.unitPriceCents);
    return { ...line, amountCents, sortOrder: index };
  });
  const subtotalCents = lineItems.reduce((sum, l) => sum + l.amountCents, 0);
  const vatCents = Math.round(subtotalCents * vatRate);
  const totalCents = subtotalCents + vatCents;
  return { subtotalCents, vatCents, totalCents, lineItems };
}

export function formatZar(cents: number): string {
  return `R${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}
