import { describe, expect, it } from 'vitest';

import {
  buildComplianceCsv,
  csvEscape,
  mapComplianceItemsToRows,
} from '@/lib/compliance-export';

describe('compliance export helpers', () => {
  it('escapes CSV values with commas', () => {
    expect(csvEscape('Acme, Ltd')).toBe('"Acme, Ltd"');
  });

  it('maps compliance items to export rows', () => {
    const rows = mapComplianceItemsToRows([
      {
        category: 'SARS',
        name: 'VAT201',
        status: 'action_required',
        dueDate: new Date('2026-03-31'),
        lastChecked: new Date('2026-02-01'),
        client: { companyName: 'Acme', registrationNumber: '2020/123456/07' },
      },
    ]);
    expect(rows[0].client).toBe('Acme');
    expect(rows[0].dueDate).toBe('2026-03-31');
  });

  it('builds CSV with header and rows', () => {
    const csv = buildComplianceCsv([
      {
        client: 'Acme',
        registrationNumber: '2020/123456/07',
        category: 'SARS',
        obligation: 'VAT201',
        status: 'compliant',
        dueDate: '2026-03-31',
        lastChecked: '2026-02-01',
      },
    ]);
    expect(csv.split('\n')).toHaveLength(2);
    expect(csv).toContain('Acme');
  });
});
