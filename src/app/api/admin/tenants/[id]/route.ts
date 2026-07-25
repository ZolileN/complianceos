import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  isPlatformAdminResponse,
  isPlatformAdminSlug,
  requirePlatformAdmin,
} from '@/lib/platform-admin';
import { logAdminAction } from '@/lib/admin-audit';
import { isTenantPlan } from '@/lib/tenant-provision';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePlatformAdmin();
  if (isPlatformAdminResponse(admin)) return admin;

  try {
    const { id } = await params;

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: { name: 'asc' },
        },
        clients: {
          select: {
            id: true,
            companyName: true,
            registrationNumber: true,
            email: true,
            phone: true,
            status: true,
            createdAt: true,
          },
          orderBy: { companyName: 'asc' },
        },
        _count: {
          select: {
            conversations: true,
            documents: true,
            tasks: true,
            complianceItems: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: tenant });
  } catch (error: unknown) {
    console.error('Error fetching tenant detail:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH — update plan and/or settings flags (no document/message content).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePlatformAdmin();
  if (isPlatformAdminResponse(admin)) return admin;

  try {
    const { id } = await params;
    const body = await req.json();
    const { plan, settings, name, email, contactNumber, website, address } = body as {
      plan?: string;
      settings?: Record<string, unknown>;
      name?: string;
      email?: string | null;
      contactNumber?: string | null;
      website?: string | null;
      address?: string | null;
    };

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, plan: true, settings: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    if (isPlatformAdminSlug(tenant.slug) && plan && plan !== tenant.plan) {
      return NextResponse.json(
        { error: 'Cannot change plan on a master control-plane tenant' },
        { status: 403 }
      );
    }

    const data: Record<string, unknown> = {};

    if (typeof plan === 'string') {
      if (!isTenantPlan(plan)) {
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
      }
      data.plan = plan;
    }

    if (settings && typeof settings === 'object') {
      let current: Record<string, unknown> = {};
      try {
        current = JSON.parse(tenant.settings || '{}') as Record<string, unknown>;
      } catch {
        current = {};
      }
      data.settings = JSON.stringify({ ...current, ...settings });
    }

    if (typeof name === 'string' && name.trim()) data.name = name.trim();
    if (email !== undefined) data.email = email;
    if (contactNumber !== undefined) data.contactNumber = contactNumber;
    if (website !== undefined) data.website = website;
    if (address !== undefined) data.address = address;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No changes requested' }, { status: 400 });
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        settings: true,
        isActive: true,
        email: true,
        contactNumber: true,
        website: true,
        address: true,
      },
    });

    if (data.plan) {
      await logAdminAction('UPDATE_TENANT_PLAN', id, {
        tenantSlug: tenant.slug,
        previousPlan: tenant.plan,
        newPlan: updated.plan,
        updatedBy: admin.email,
      });
    } else {
      await logAdminAction('UPDATE_TENANT_PLAN', id, {
        tenantSlug: tenant.slug,
        fields: Object.keys(data),
        updatedBy: admin.email,
        note: 'settings_or_profile',
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error('Error updating tenant:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePlatformAdmin();
  if (isPlatformAdminResponse(admin)) return admin;

  try {
    const { id } = await params;

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      select: { name: true, slug: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    if (isPlatformAdminSlug(tenant.slug)) {
      return NextResponse.json(
        { error: 'Master tenants cannot be deleted' },
        { status: 403 }
      );
    }

    await logAdminAction('DELETE_TENANT', id, {
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      deletedBy: admin.email,
    });

    await prisma.tenant.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Tenant and all associated data permanently deleted.',
    });
  } catch (error: unknown) {
    console.error('Error deleting tenant:', error);
    return NextResponse.json(
      { error: 'Internal server error during deletion' },
      { status: 500 }
    );
  }
}
