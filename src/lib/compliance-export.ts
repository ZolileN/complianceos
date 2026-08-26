import { Prisma } from '@prisma/client';

import { buildBrandedCompliancePdf } from './compliance-report-pdf';

export type ComplianceExportRow = {
  client: string;
  registrationNumber: string;
  category: string;
  obligation: string;
  status: string;
  dueDate: string;
  lastChecked: string;
};

export function csvEscape(value: string | number | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function mapComplianceItemsToRows(
  items: Array<{
    category: string;
    name: string;
    status: string;
    dueDate: Date | null;
    lastChecked: Date;
    client: { companyName: string; registrationNumber: string | null };
  }>
): ComplianceExportRow[] {
  return items.map((item) => ({
    client: item.client.companyName,
    registrationNumber: item.client.registrationNumber || '',
    category: item.category,
    obligation: item.name,
    status: item.status,
    dueDate: item.dueDate ? item.dueDate.toISOString().split('T')[0] : '',
    lastChecked: item.lastChecked.toISOString().split('T')[0],
  }));
}

export function buildComplianceCsv(rows: ComplianceExportRow[]): string {
  const header = [
    'Client',
    'Registration Number',
    'Category',
    'Obligation',
    'Status',
    'Due Date',
    'Last Checked',
  ].join(',');

  const body = rows.map((row) =>
    [
      csvEscape(row.client),
      csvEscape(row.registrationNumber),
      csvEscape(row.category),
      csvEscape(row.obligation),
      csvEscape(row.status),
      csvEscape(row.dueDate),
      csvEscape(row.lastChecked),
    ].join(',')
  );

  return [header, ...body].join('\n');
}

export async function buildCompliancePdf(
  rows: ComplianceExportRow[],
  opts: { title?: string; generatedAt?: Date; tenantName?: string } = {}
): Promise<Buffer> {
  return buildBrandedCompliancePdf(rows, opts);
}

export type ComplianceQueryWhere = Prisma.ComplianceItemWhereInput;
