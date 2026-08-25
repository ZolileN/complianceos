import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getOnboardingUrl } from '@/lib/appUrl';
import { inboundAddressForTenant } from '@/lib/inbound-email';

type FirmOnboardingSettings = {
  completedAt?: string;
  dismissedAt?: string;
  lastStep?: number;
};

function parseTenantSettings(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw || '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as { tenantId: string; role: string };
  if (!currentUser.tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const tenant = await prisma.tenant.findUnique({
    where: { id: currentUser.tenantId },
    select: {
      id: true,
      slug: true,
      name: true,
      settings: true,
      whatsappSetupComplete: true,
      _count: { select: { clients: true, users: true } },
    },
  });

  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const settings = parseTenantSettings(tenant.settings);
  const firmOnboarding = (settings.firmOnboarding || {}) as FirmOnboardingSettings;

  return NextResponse.json({
    data: {
      completed: Boolean(firmOnboarding.completedAt),
      dismissed: Boolean(firmOnboarding.dismissedAt),
      lastStep: firmOnboarding.lastStep ?? 0,
      showWizard:
        !firmOnboarding.completedAt &&
        !firmOnboarding.dismissedAt &&
        (currentUser.role === 'administrator' || currentUser.role === 'operations_manager'),
      tenantSlug: tenant.slug,
      firmName: tenant.name,
      onboardingUrl: getOnboardingUrl(tenant.slug),
      inboundAddress: inboundAddressForTenant(tenant.slug),
      whatsappConnected: tenant.whatsappSetupComplete,
      stats: {
        clients: tenant._count.clients,
        users: tenant._count.users,
      },
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as { tenantId: string; role: string };
  if (!currentUser.tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  if (currentUser.role !== 'administrator' && currentUser.role !== 'operations_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { action?: string; step?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: currentUser.tenantId },
    select: { settings: true },
  });
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const settings = parseTenantSettings(tenant.settings);
  const firmOnboarding = (settings.firmOnboarding || {}) as FirmOnboardingSettings;
  const now = new Date().toISOString();

  if (body.action === 'complete') {
    firmOnboarding.completedAt = now;
    firmOnboarding.dismissedAt = undefined;
  } else if (body.action === 'dismiss') {
    firmOnboarding.dismissedAt = now;
  } else if (body.action === 'step' && typeof body.step === 'number') {
    firmOnboarding.lastStep = body.step;
  } else if (body.action === 'reset') {
    delete settings.firmOnboarding;
    await prisma.tenant.update({
      where: { id: currentUser.tenantId },
      data: { settings: JSON.stringify(settings) },
    });
    return NextResponse.json({ success: true, data: { reset: true } });
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  settings.firmOnboarding = firmOnboarding;

  await prisma.tenant.update({
    where: { id: currentUser.tenantId },
    data: { settings: JSON.stringify(settings) },
  });

  return NextResponse.json({
    success: true,
    data: {
      completed: Boolean(firmOnboarding.completedAt),
      dismissed: Boolean(firmOnboarding.dismissedAt),
      lastStep: firmOnboarding.lastStep ?? 0,
    },
  });
}
