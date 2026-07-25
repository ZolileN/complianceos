import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  isPlatformAdminResponse,
  requirePlatformAdmin,
} from '@/lib/platform-admin';
import { logAdminAction } from '@/lib/admin-audit';

export async function GET() {
  const admin = await requirePlatformAdmin();
  if (isPlatformAdminResponse(admin)) return admin;

  try {
    const clients = await prisma.client.findMany({
      where: { status: 'onboarding' },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true },
        },
        assignedConsultant: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: clients });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : 'Failed to fetch onboarding clients';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST — complete | reject | reassign an onboarding client (metadata only).
 */
export async function POST(request: NextRequest) {
  const admin = await requirePlatformAdmin();
  if (isPlatformAdminResponse(admin)) return admin;

  try {
    const body = await request.json();
    const { clientId, action, assignedConsultantId } = body as {
      clientId?: string;
      action?: 'complete' | 'reject' | 'reassign';
      assignedConsultantId?: string | null;
    };

    if (!clientId || !action) {
      return NextResponse.json(
        { error: 'clientId and action are required' },
        { status: 400 }
      );
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        companyName: true,
        status: true,
        tenantId: true,
        assignedConsultantId: true,
        tenant: { select: { slug: true, name: true } },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    if (action === 'complete') {
      const updated = await prisma.client.update({
        where: { id: clientId },
        data: { status: 'active' },
        select: { id: true, status: true, companyName: true },
      });
      await logAdminAction('COMPLETE_ONBOARDING', clientId, {
        companyName: client.companyName,
        tenantId: client.tenantId,
        tenantSlug: client.tenant.slug,
        previousStatus: client.status,
      });
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === 'reject') {
      const updated = await prisma.client.update({
        where: { id: clientId },
        data: { status: 'inactive' },
        select: { id: true, status: true, companyName: true },
      });
      await logAdminAction('REJECT_ONBOARDING', clientId, {
        companyName: client.companyName,
        tenantId: client.tenantId,
        tenantSlug: client.tenant.slug,
        previousStatus: client.status,
      });
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === 'reassign') {
      if (assignedConsultantId) {
        const consultant = await prisma.user.findFirst({
          where: {
            id: assignedConsultantId,
            tenantId: client.tenantId,
            isActive: true,
          },
          select: { id: true, role: true },
        });
        if (!consultant) {
          return NextResponse.json(
            { error: 'Consultant not found in client tenant' },
            { status: 400 }
          );
        }
        if (consultant.role === 'client') {
          return NextResponse.json(
            { error: 'Cannot assign a client user as consultant' },
            { status: 400 }
          );
        }
      }

      const updated = await prisma.client.update({
        where: { id: clientId },
        data: { assignedConsultantId: assignedConsultantId ?? null },
        select: {
          id: true,
          status: true,
          companyName: true,
          assignedConsultantId: true,
        },
      });
      await logAdminAction('REASSIGN_ONBOARDING', clientId, {
        companyName: client.companyName,
        tenantId: client.tenantId,
        tenantSlug: client.tenant.slug,
        previousConsultantId: client.assignedConsultantId,
        newConsultantId: updated.assignedConsultantId,
      });
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : 'Failed to update onboarding';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
