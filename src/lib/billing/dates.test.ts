import { describe, expect, it } from 'vitest';
import { addOneMonth } from '@/lib/billing/dates';

describe('addOneMonth', () => {
  it('advances by one calendar month', () => {
    const from = new Date('2026-01-15T12:00:00.000Z');
    const next = addOneMonth(from);
    expect(next.getUTCFullYear()).toBe(2026);
    expect(next.getUTCMonth()).toBe(1); // February
    expect(next.getUTCDate()).toBe(15);
  });
});
