import { calculateLineTotals } from '@/lib/invoicing/calculations';
import { describe, expect, it } from 'vitest';

describe('calculateLineTotals', () => {
  it('computes subtotal, VAT, and line amounts', () => {
    const result = calculateLineTotals([
      { description: 'Compliance fee', quantity: 2, unitPriceCents: 10000 },
    ]);
    expect(result.subtotalCents).toBe(20000);
    expect(result.vatCents).toBe(3000);
    expect(result.totalCents).toBe(23000);
    expect(result.lineItems[0].amountCents).toBe(20000);
  });

  it('handles multiple lines', () => {
    const result = calculateLineTotals([
      { description: 'A', quantity: 1, unitPriceCents: 5000 },
      { description: 'B', quantity: 3, unitPriceCents: 1000 },
    ]);
    expect(result.subtotalCents).toBe(8000);
    expect(result.totalCents).toBe(9200);
  });
});
