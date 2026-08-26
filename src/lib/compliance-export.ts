import { Prisma } from '@prisma/client';
import PDFDocument from 'pdfkit';

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
  opts: { title?: string; generatedAt?: Date } = {}
): Promise<Buffer> {
  const title = opts.title || 'Compliance Portfolio Report';
  const generatedAt = opts.generatedAt || new Date();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text(title, { align: 'left' });
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .fillColor('#555555')
      .text(`Generated ${generatedAt.toLocaleString('en-ZA')}`);
    doc.moveDown(1);

    const summary = {
      total: rows.length,
      critical: rows.filter((r) => r.status === 'critical').length,
      action_required: rows.filter((r) => r.status === 'action_required').length,
      compliant: rows.filter((r) => r.status === 'compliant').length,
    };

    doc.fillColor('#000000').fontSize(11).text('Summary', { underline: true });
    doc.moveDown(0.3);
    doc.text(`Total obligations: ${summary.total}`);
    doc.text(`Critical: ${summary.critical}`);
    doc.text(`Action required: ${summary.action_required}`);
    doc.text(`Compliant: ${summary.compliant}`);
    doc.moveDown(1);

    doc.fontSize(11).text('Obligations', { underline: true });
    doc.moveDown(0.5);

    if (rows.length === 0) {
      doc.fontSize(10).text('No compliance items found.');
    } else {
      for (const row of rows) {
        doc
          .fontSize(10)
          .fillColor('#000000')
          .text(`${row.client} — ${row.category} / ${row.obligation}`);
        doc
          .fontSize(9)
          .fillColor('#444444')
          .text(
            `Status: ${row.status.replace(/_/g, ' ')} | Due: ${row.dueDate || '—'} | Reg: ${row.registrationNumber || '—'}`
          );
        doc.moveDown(0.4);
        if (doc.y > 720) {
          doc.addPage();
        }
      }
    }

    doc.end();
  });
}

export type ComplianceQueryWhere = Prisma.ComplianceItemWhereInput;
