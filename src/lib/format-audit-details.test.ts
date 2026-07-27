import { describe, expect, it } from 'vitest';
import { formatAuditDetailValue } from './format-audit-details';

describe('formatAuditDetailValue', () => {
  it('stringifies nested objects', () => {
    const formatted = formatAuditDetailValue({ plan: 'growth', seats: 5 });
    expect(formatted).toBe('{\n  "plan": "growth",\n  "seats": 5\n}');
  });

  it('does not collapse objects to [object Object]', () => {
    expect(formatAuditDetailValue({ nested: { ok: true } })).not.toContain('[object Object]');
  });

  it('returns primitives as strings', () => {
    expect(formatAuditDetailValue('active')).toBe('active');
    expect(formatAuditDetailValue(42)).toBe('42');
    expect(formatAuditDetailValue(true)).toBe('true');
  });
});
