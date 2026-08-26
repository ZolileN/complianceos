import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { requireStaff } from '@/lib/rbac';
import { lookupCompanyProfile } from '@/lib/integrations/cipc';
import { getRegistrySnapshot } from '@/lib/integrations/cipc/registry-snapshot';
import { syncClientRegistry } from '@/lib/integrations/cipc/sync';
import {
  computeAnnualReturnsDueDate,
} from '@/lib/cipc-due-dates';

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
      snapshot: await getRegistrySnapshot(id),
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

  const result = await syncClientRegistry(tenantId, id);
  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Registry sync failed' }, { status: 404 });
  }

  const profile = await lookupCompanyProfile(tenantId, enterpriseNumber);
  const snapshot = await getRegistrySnapshot(id);

  return NextResponse.json({
    success: true,
    data: {
      profile,
      snapshot,
      sync: result,
    },
  });
}
