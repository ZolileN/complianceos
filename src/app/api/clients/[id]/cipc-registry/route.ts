import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { requireStaff } from '@/lib/rbac';
import { lookupCompanyProfile } from '@/lib/integrations/cipc';
import {
  annualReturnsStatusForDueDate,
  computeAnnualReturnsDueDate,
} from '@/lib/cipc-due-dates';
import { resolveObligation } from '@/lib/compliance-catalog';
import {
  emitComplianceStatusChanged,
  notifyComplianceStakeholders,
} from '@/lib/compliance-monitor';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as { tenantId: string; role: string; id: string };
  const forbidden = requireStaff(currentUser);
  if (forbidden) return forbidden;

  const tenantId = currentUser.tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const client = await prisma.client.findFirst({
    where: { id, tenantId },
    select: {
      id: true,
      companyName: true,
      registrationNumber: true,
      assignedConsultantId: true,
    },
  });
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const enterpriseNumber = client.registrationNumber?.trim();
  if (!enterpriseNumber) {
    return NextResponse.json(
      { error: 'Add a CIPC registration number to look up the company profile.' },
      { status: 400 }
    );
  }

  const profile = await lookupCompanyProfile(tenantId, enterpriseNumber);
  if (!profile) {
    return NextResponse.json(
      {
        error:
          'No registry data found. Upload a COR14.3 certificate or configure a CIPC provider.',
        enterpriseNumber,
      },
      { status: 404 }
    );
  }

  let annualReturnsDueDate: string | null = null;
  if (profile.registrationDate) {
    const due = computeAnnualReturnsDueDate(profile.registrationDate);
    annualReturnsDueDate = due ? due.toISOString() : null;
  }

  return NextResponse.json({
    data: {
      profile,
      annual_returns_due_date: annualReturnsDueDate,
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as { tenantId: string; role: string; id: string };
  const forbidden = requireStaff(currentUser);
  if (forbidden) return forbidden;

  const tenantId = currentUser.tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const client = await prisma.client.findFirst({
    where: { id, tenantId },
    select: {
      id: true,
      companyName: true,
      registrationNumber: true,
      taxNumber: true,
      assignedConsultantId: true,
    },
  });
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const enterpriseNumber = client.registrationNumber?.trim();
  if (!enterpriseNumber) {
    return NextResponse.json({ error: 'Registration number required' }, { status: 400 });
  }

  const profile = await lookupCompanyProfile(tenantId, enterpriseNumber);
  if (!profile) {
    return NextResponse.json({ error: 'Registry profile not found' }, { status: 404 });
  }

  const clientUpdate: Record<string, string> = {};
  if (profile.companyName && profile.companyName !== 'Unknown') {
    clientUpdate.companyName = profile.companyName;
  }
  if (profile.taxNumber && !client.taxNumber) {
    clientUpdate.taxNumber = profile.taxNumber;
  }

  if (Object.keys(clientUpdate).length > 0) {
    await prisma.client.update({ where: { id }, data: clientUpdate });
  }

  let complianceItem = null;
  if (profile.registrationDate) {
    const dueDate = computeAnnualReturnsDueDate(profile.registrationDate);
    if (dueDate) {
      const resolved = resolveObligation('CIPC', 'Annual Returns');
      const status = annualReturnsStatusForDueDate(dueDate);
      const existing = await prisma.complianceItem.findUnique({
        where: {
          clientId_category_name: {
            clientId: id,
            category: resolved.category,
            name: resolved.name,
          },
        },
      });
      const previousStatus = existing?.status ?? null;

      complianceItem = await prisma.complianceItem.upsert({
        where: {
          clientId_category_name: {
            clientId: id,
            category: resolved.category,
            name: resolved.name,
          },
        },
        update: {
          dueDate,
          status,
          lastChecked: new Date(),
          notes:
            (existing?.notes ? `${existing.notes}\n\n` : '') +
            `Annual returns due date updated from CIPC registry (${profile.source}).`,
        },
        create: {
          clientId: id,
          tenantId,
          category: resolved.category,
          name: resolved.name,
          status,
          dueDate,
          lastChecked: new Date(),
          notes: `Set from CIPC registry lookup (${profile.source}).`,
        },
      });

      if (previousStatus !== complianceItem.status) {
        await emitComplianceStatusChanged(
          {
            id: complianceItem.id,
            clientId: complianceItem.clientId,
            tenantId: complianceItem.tenantId,
            category: complianceItem.category,
            name: complianceItem.name,
            status: complianceItem.status,
            dueDate: complianceItem.dueDate,
          },
          previousStatus,
          currentUser.id,
          currentUser.role
        );
        await notifyComplianceStakeholders(
          {
            id: complianceItem.id,
            clientId: complianceItem.clientId,
            tenantId: complianceItem.tenantId,
            category: complianceItem.category,
            name: complianceItem.name,
            status: complianceItem.status,
            dueDate: complianceItem.dueDate,
          },
          {
            title: `CIPC annual returns updated`,
            message: `${client.companyName} — due ${dueDate.toLocaleDateString('en-ZA')} (registry lookup).`,
            type: status === 'critical' ? 'error' : status === 'action_required' ? 'warning' : 'success',
            dedupeKey: 'cipc-registry',
          },
          client.assignedConsultantId
        );
      }
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      profile,
      client_updates: clientUpdate,
      compliance_item: complianceItem,
    },
  });
}
