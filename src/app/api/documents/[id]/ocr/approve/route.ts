import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';
import { logAuditAction } from '@/lib/auditLogger';
import { resolveObligation } from '@/lib/compliance-catalog';
import {
  emitComplianceStatusChanged,
  nextDueAfterCompliant,
  notifyComplianceStakeholders,
} from '@/lib/compliance-monitor';

async function upsertObligation(opts: {
  clientId: string;
  tenantId: string;
  category: string;
  name: string;
  status: string;
  dueDate: Date | null;
  userId: string;
  userRole: string;
  assignedConsultantId?: string | null;
  companyName?: string;
}) {
  const resolved = resolveObligation(opts.category, opts.name);
  let dueDate = opts.dueDate;
  if (opts.status === 'compliant' && !dueDate) {
    dueDate = nextDueAfterCompliant(resolved.category, resolved.name, null);
  }

  const existing = await prisma.complianceItem.findUnique({
    where: {
      clientId_category_name: {
        clientId: opts.clientId,
        category: resolved.category,
        name: resolved.name,
      },
    },
  });

  const previousStatus = existing?.status ?? null;
  const item = await prisma.complianceItem.upsert({
    where: {
      clientId_category_name: {
        clientId: opts.clientId,
        category: resolved.category,
        name: resolved.name,
      },
    },
    update: {
      status: opts.status,
      dueDate,
      lastChecked: new Date(),
    },
    create: {
      clientId: opts.clientId,
      tenantId: opts.tenantId,
      category: resolved.category,
      name: resolved.name,
      status: opts.status,
      dueDate,
      lastChecked: new Date(),
    },
  });

  const like = {
    id: item.id,
    clientId: item.clientId,
    tenantId: item.tenantId,
    category: item.category,
    name: item.name,
    status: item.status,
    dueDate: item.dueDate,
  };

  if (previousStatus !== item.status) {
    await emitComplianceStatusChanged(like, previousStatus, opts.userId, opts.userRole);
    await notifyComplianceStakeholders(
      like,
      {
        title: `Compliance updated: ${item.name}`,
        message: `${opts.companyName || 'Client'} — ${item.category} / ${item.name} is now "${item.status.replace(/_/g, ' ')}" (OCR approve).`,
        type: item.status === 'critical' ? 'error' : item.status === 'action_required' ? 'warning' : 'success',
        dedupeKey: `ocr-${item.status}`,
      },
      opts.assignedConsultantId
    );
  }

  return item;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const currentUser = session.user as { tenantId: string; role: string; id: string };
  const tenantId = currentUser.tenantId;

  // Clients cannot approve OCR data
  if (currentUser.role === 'client') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const document = await prisma.document.findFirst({
      where: { id, tenantId },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            assignedConsultantId: true,
          },
        },
      },
    });

    if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    
    // Cast to unknown and then to custom type to bypass stale IDE cache
    const docWithOcr = document as unknown as { ocrMetadata: string | null; clientId: string };
    if (!docWithOcr.ocrMetadata) return NextResponse.json({ error: 'No OCR data to approve' }, { status: 400 });

    const metadata = JSON.parse(docWithOcr.ocrMetadata);
    const updateData: Record<string, unknown> = {};

    // Core identifier fields — always sync when present
    if (metadata.vat_number)           updateData.vatNumber           = metadata.vat_number;
    if (metadata.registration_number)  updateData.registrationNumber  = metadata.registration_number;
    if (metadata.tax_number)           updateData.taxNumber           = metadata.tax_number;

    // COR14.3 specific: company name (only override if it looks meaningful)
    if (metadata.company_name && metadata.company_name !== 'PraxisOne Client') {
      updateData.companyName = metadata.company_name;
    }

    // Address extraction: handle both 'registered_address' from COR and 'address' from bank statements
    const extractedAddress = metadata.registered_address || metadata.address;
    if (extractedAddress) {
      updateData.address = extractedAddress;
    }

    // Directors: store as JSON string of objects on the client record
    if (metadata.directors) {
      const directorObjects = metadata.directors.split('; ').map((dirStr: string) => {
        // e.g., "NONZAPA, ZOLILE JACKSON (ID: 8404145741084, Appointed: 27/03/2023)"
        const nameMatch = dirStr.match(/^([^(]+)/);
        const idMatch = dirStr.match(/ID:\s*([^,)]+)/);
        return {
          name: nameMatch ? nameMatch[1].trim() : dirStr,
          id_number: idMatch ? idMatch[1].trim() : '',
          email: '',
          phone: ''
        };
      });
      updateData.directors = JSON.stringify(directorObjects);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No actionable client fields found in OCR metadata' }, { status: 400 });
    }

    const updatedClient = await prisma.client.update({
      where: { id: document.clientId },
      data: updateData
    });

    // --- AUTOMATED COMPLIANCE ALERTS (canonical obligation names) ---
    const now = new Date();
    const clientMeta = {
      userId: currentUser.id,
      userRole: currentUser.role,
      assignedConsultantId: document.client?.assignedConsultantId,
      companyName: document.client?.companyName,
    };

    if (document.category === 'bee_certificate' && metadata.expiry_date) {
      const isExpired = new Date(metadata.expiry_date) < now;
      await upsertObligation({
        clientId: document.clientId,
        tenantId,
        category: 'BEE',
        name: 'Certificate Expiry',
        status: isExpired ? 'action_required' : 'compliant',
        dueDate: new Date(metadata.expiry_date),
        ...clientMeta,
      });
    } else if ((document.category === 'tax_certificate' || document.category === 'tax_clearance') && metadata.expiry_date) {
      const isExpired = new Date(metadata.expiry_date) < now;
      await upsertObligation({
        clientId: document.clientId,
        tenantId,
        category: 'SARS',
        name: 'Income Tax',
        status: isExpired ? 'action_required' : 'compliant',
        dueDate: new Date(metadata.expiry_date),
        ...clientMeta,
      });
    } else if (document.category === 'cor_document' && metadata.registration_date) {
      // Annual Returns are due within 30 days after the anniversary of the registration date
      const regParts = metadata.registration_date.split('/');
      let regDateStr = metadata.registration_date;
      if (regParts.length === 3 && regParts[0].length === 2) {
        regDateStr = `${regParts[2]}-${regParts[1]}-${regParts[0]}`;
      }
      const regDate = new Date(regDateStr);

      if (!isNaN(regDate.getTime())) {
        const currentYear = now.getFullYear();
        let nextAnniversary = new Date(currentYear, regDate.getMonth(), regDate.getDate());

        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        if (now.getTime() - nextAnniversary.getTime() > thirtyDaysInMs) {
          nextAnniversary = new Date(currentYear + 1, regDate.getMonth(), regDate.getDate());
        }

        const nextDueDate = new Date(nextAnniversary.getTime() + thirtyDaysInMs);
        const isInsideWindow = now >= nextAnniversary && now <= nextDueDate;

        await upsertObligation({
          clientId: document.clientId,
          tenantId,
          category: 'CIPC',
          name: 'Annual Returns',
          status: isInsideWindow ? 'action_required' : 'compliant',
          dueDate: nextDueDate,
          ...clientMeta,
        });
      }
    }

    await logAuditAction({
      tenantId,
      userId: currentUser.id,
      action: 'UPDATE',
      entityType: 'Document',
      entityId: id,
      details: { ocrApproved: true, updatedClientFields: Object.keys(updateData) },
    });

    return NextResponse.json({ success: true, data: updatedClient });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
