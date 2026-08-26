import { prisma } from '@/lib/prisma';
import {
  buildComplianceCsv,
  buildCompliancePdf,
  mapComplianceItemsToRows,
} from '@/lib/compliance-export';
import { sendComplianceReportEmail } from '@/lib/email';

export type ComplianceReportEmailResult = {
  tenants: number;
  recipients: number;
  sent: number;
  skipped: number;
};

/**
 * Weekly compliance portfolio report emailed to tenant administrators and ops managers.
 */
export async function runComplianceReportEmailJob(): Promise<ComplianceReportEmailResult> {
  const tenants = await prisma.tenant.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  let recipients = 0;
  let sent = 0;
  let skipped = 0;

  for (const tenant of tenants) {
    const staff = await prisma.user.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
        role: { in: ['administrator', 'operations_manager'] },
        email: { not: null },
      },
      select: { email: true },
    });

    if (staff.length === 0) {
      skipped++;
      continue;
    }

    const items = await prisma.complianceItem.findMany({
      where: { tenantId: tenant.id },
      include: {
        client: { select: { companyName: true, registrationNumber: true } },
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });

    const rows = mapComplianceItemsToRows(items);
    const csv = buildComplianceCsv(rows);
    const pdf = await buildCompliancePdf(rows, {
      title: 'Compliance portfolio report',
      tenantName: tenant.name,
    });
    const dateLabel = new Date().toISOString().split('T')[0];

    for (const user of staff) {
      if (!user.email) continue;
      recipients++;

      const result = await sendComplianceReportEmail(user.email, {
        tenantName: tenant.name,
        dateLabel,
        itemCount: rows.length,
        criticalCount: rows.filter((r) => r.status === 'critical').length,
        csvContent: csv,
        pdfBuffer: pdf,
      });

      if (result.success) sent++;
      else skipped++;
    }
  }

  return { tenants: tenants.length, recipients, sent, skipped };
}
