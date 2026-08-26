import PDFDocument from 'pdfkit';

import type { ComplianceExportRow } from './compliance-export';

type PdfDoc = InstanceType<typeof PDFDocument>;

const LOGO_URL = 'https://praxis.mlkcomputer.com/images/praxisone-logo.png';

const BRAND = {
  teal: '#0f766e',
  mint: '#5EEAD4',
  ink: '#0f172a',
  headerBg: '#0f172a',
  white: '#ffffff',
  muted: '#64748b',
  border: '#e2e8f0',
  rowAlt: '#f8fafc',
  critical: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
  action: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  compliant: { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
  neutral: { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' },
} as const;

const STATUS_ORDER: Record<string, number> = {
  critical: 0,
  action_required: 1,
  compliant: 2,
  not_applicable: 3,
};

const PAGE = {
  width: 595.28,
  height: 841.89,
  margin: 48,
  footerY: 800,
};

type PdfSummary = {
  total: number;
  critical: number;
  action_required: number;
  compliant: number;
};

function statusPalette(status: string) {
  if (status === 'critical') return BRAND.critical;
  if (status === 'action_required') return BRAND.action;
  if (status === 'compliant') return BRAND.compliant;
  return BRAND.neutral;
}

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateLabel(value: string): string {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function sortRows(rows: ComplianceExportRow[]): ComplianceExportRow[] {
  return [...rows].sort((a, b) => {
    const statusDiff = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
    if (statusDiff !== 0) return statusDiff;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return a.client.localeCompare(b.client);
  });
}

async function loadLogoBuffer(): Promise<Buffer | null> {
  try {
    const response = await fetch(LOGO_URL);
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

function drawBrandHeader(
  doc: PdfDoc,
  opts: { title: string; subtitle: string; logo?: Buffer | null }
) {
  const contentWidth = PAGE.width - PAGE.margin * 2;

  doc.save();
  doc.rect(0, 0, PAGE.width, 108).fill(BRAND.headerBg);
  doc.restore();

  if (opts.logo) {
    doc.image(opts.logo, PAGE.margin, 28, { width: 32, height: 32 });
    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor(BRAND.white)
      .text('Praxis', PAGE.margin + 40, 34, { continued: true });
    doc.fillColor(BRAND.mint).text('One', { continued: false });
  } else {
    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor(BRAND.white)
      .text('Praxis', PAGE.margin, 34, { continued: true });
    doc.fillColor(BRAND.mint).text('One', { continued: false });
  }

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#94a3b8')
    .text('Portfolio monitoring', PAGE.margin, 58);

  doc
    .font('Helvetica-Bold')
    .fontSize(20)
    .fillColor(BRAND.ink)
    .text(opts.title, PAGE.margin, 124, { width: contentWidth });

  doc
    .moveTo(PAGE.margin, 154)
    .lineTo(PAGE.margin + 72, 154)
    .lineWidth(3)
    .strokeColor(BRAND.teal)
    .stroke();

  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(BRAND.muted)
    .text(opts.subtitle, PAGE.margin, 164);

  return 188;
}

function drawSummaryCards(doc: PdfDoc, summary: PdfSummary, startY: number) {
  const contentWidth = PAGE.width - PAGE.margin * 2;
  const gap = 12;
  const cardWidth = (contentWidth - gap * 3) / 4;
  const cardHeight = 58;

  const cards = [
    { label: 'Total', value: summary.total, accent: BRAND.teal },
    { label: 'Critical', value: summary.critical, accent: BRAND.critical.text },
    { label: 'Action required', value: summary.action_required, accent: BRAND.action.text },
    { label: 'Compliant', value: summary.compliant, accent: BRAND.compliant.text },
  ];

  cards.forEach((card, index) => {
    const x = PAGE.margin + index * (cardWidth + gap);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 8).fillAndStroke('#ffffff', BRAND.border);
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(BRAND.muted)
      .text(card.label.toUpperCase(), x + 12, startY + 12, { width: cardWidth - 24 });
    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .fillColor(card.accent)
      .text(String(card.value), x + 12, startY + 26, { width: cardWidth - 24 });
  });

  return startY + cardHeight + 24;
}

function measureRowHeight(
  doc: PdfDoc,
  row: ComplianceExportRow,
  colWidths: number[]
): number {
  const padding = 8;
  const title = `${row.category} / ${row.obligation}`;
  const clientHeight = doc.heightOfString(row.client, { width: colWidths[0] - padding * 2 });
  const titleHeight = doc.heightOfString(title, { width: colWidths[1] - padding * 2 });
  return Math.max(clientHeight, titleHeight, 14) + padding * 2;
}

function drawStatusBadge(
  doc: PdfDoc,
  status: string,
  x: number,
  y: number,
  maxWidth: number
) {
  const palette = statusPalette(status);
  const label = formatStatusLabel(status);
  const badgeWidth = Math.min(maxWidth, doc.widthOfString(label) + 16);
  const badgeHeight = 18;

  doc.roundedRect(x, y, badgeWidth, badgeHeight, 9).fillAndStroke(palette.bg, palette.border);
  doc
    .font('Helvetica-Bold')
    .fontSize(7.5)
    .fillColor(palette.text)
    .text(label, x, y + 5, { width: badgeWidth, align: 'center' });
}

function drawTableHeader(doc: PdfDoc, y: number, colWidths: number[]) {
  const headers = ['Client', 'Obligation', 'Status', 'Due', 'Reg. no.'];
  let x = PAGE.margin;

  doc.save();
  doc.rect(PAGE.margin, y, colWidths.reduce((a, b) => a + b, 0), 24).fill('#f1f5f9');
  doc.restore();

  headers.forEach((header, index) => {
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(BRAND.teal)
      .text(header.toUpperCase(), x + 8, y + 8, { width: colWidths[index] - 16 });
    x += colWidths[index];
  });

  doc
    .moveTo(PAGE.margin, y + 24)
    .lineTo(PAGE.width - PAGE.margin, y + 24)
    .lineWidth(1)
    .strokeColor(BRAND.border)
    .stroke();

  return y + 24;
}

function drawTableRows(
  doc: PdfDoc,
  rows: ComplianceExportRow[],
  startY: number,
  colWidths: number[]
) {
  let y = startY;
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);

  rows.forEach((row, rowIndex) => {
    doc.font('Helvetica').fontSize(9);
    const rowHeight = measureRowHeight(doc, row, colWidths);
    const pageBottom = PAGE.footerY - 24;

    if (y + rowHeight > pageBottom) {
      doc.addPage({ margin: PAGE.margin });
      y = drawTableHeader(doc, PAGE.margin, colWidths);
    }

    if (rowIndex % 2 === 1) {
      doc.save();
      doc.rect(PAGE.margin, y, tableWidth, rowHeight).fill(BRAND.rowAlt);
      doc.restore();
    }

    let x = PAGE.margin;
    const obligation = `${row.category} / ${row.obligation}`;

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(BRAND.ink)
      .text(row.client, x + 8, y + 8, { width: colWidths[0] - 16 });
    x += colWidths[0];

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#334155')
      .text(obligation, x + 8, y + 8, { width: colWidths[1] - 16 });
    x += colWidths[1];

    drawStatusBadge(doc, row.status, x + 8, y + 8, colWidths[2] - 16);
    x += colWidths[2];

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(BRAND.muted)
      .text(formatDateLabel(row.dueDate), x + 8, y + 10, { width: colWidths[3] - 16 });
    x += colWidths[3];

    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(BRAND.muted)
      .text(row.registrationNumber || '—', x + 8, y + 10, { width: colWidths[4] - 16 });

    y += rowHeight;
    doc
      .moveTo(PAGE.margin, y)
      .lineTo(PAGE.margin + tableWidth, y)
      .lineWidth(0.5)
      .strokeColor(BRAND.border)
      .stroke();
  });
}

function drawFooters(doc: PdfDoc) {
  const range = doc.bufferedPageRange();
  const totalPages = range.count;
  const footerTextY = PAGE.footerY + 8;

  for (let i = range.start; i < range.start + totalPages; i++) {
    doc.switchToPage(i);

    doc
      .moveTo(PAGE.margin, PAGE.footerY)
      .lineTo(PAGE.width - PAGE.margin, PAGE.footerY)
      .lineWidth(0.5)
      .strokeColor(BRAND.border)
      .stroke();

    doc.font('Helvetica').fontSize(8).fillColor(BRAND.muted);
    doc.text('PraxisOne · praxis.mlkcomputer.com', PAGE.margin, footerTextY, {
      lineBreak: false,
    });

    const pageLabel = `Page ${i + 1} of ${totalPages}`;
    const labelWidth = doc.widthOfString(pageLabel);
    doc.text(pageLabel, PAGE.width - PAGE.margin - labelWidth, footerTextY, {
      lineBreak: false,
    });
  }
}

export async function buildBrandedCompliancePdf(
  rows: ComplianceExportRow[],
  opts: { title?: string; generatedAt?: Date; tenantName?: string } = {}
): Promise<Buffer> {
  const title = opts.title || 'Compliance portfolio report';
  const generatedAt = opts.generatedAt || new Date();
  const sortedRows = sortRows(rows);
  const summary: PdfSummary = {
    total: rows.length,
    critical: rows.filter((r) => r.status === 'critical').length,
    action_required: rows.filter((r) => r.status === 'action_required').length,
    compliant: rows.filter((r) => r.status === 'compliant').length,
  };

  const subtitleParts = [
    `Generated ${generatedAt.toLocaleString('en-ZA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`,
  ];
  if (opts.tenantName) subtitleParts.unshift(opts.tenantName);

  const logo = await loadLogoBuffer();
  const colWidths = [118, 150, 88, 72, 71];

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: PAGE.margin,
      bufferPages: true,
    });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    let y = drawBrandHeader(doc, {
      title,
      subtitle: subtitleParts.join(' · '),
      logo,
    });
    y = drawSummaryCards(doc, summary, y);

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(BRAND.ink)
      .text('Portfolio obligations', PAGE.margin, y);
    y += 18;

    if (sortedRows.length === 0) {
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(BRAND.muted)
        .text('No compliance items found for this portfolio.', PAGE.margin, y);
    } else {
      y = drawTableHeader(doc, y, colWidths);
      drawTableRows(doc, sortedRows, y, colWidths);
    }

    const pageRange = doc.bufferedPageRange();
    const extraPages = pageRange.count - 1;
    for (let i = 0; i < extraPages; i++) {
      doc.switchToPage(i + 1);
      doc.save();
      doc.rect(0, 0, PAGE.width, 36).fill(BRAND.headerBg);
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(BRAND.white)
        .text('Praxis', PAGE.margin, 12, { continued: true, lineBreak: false });
      doc.fillColor(BRAND.mint).text('One', { continued: false, lineBreak: false });
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#94a3b8')
        .text('Compliance portfolio report', PAGE.margin + 62, 14, { lineBreak: false });
      doc.restore();
    }

    drawFooters(doc);
    doc.end();
  });
}
