import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  isPlatformAdminResponse,
  requirePlatformAdmin,
} from '@/lib/platform-admin';
import { logAdminAction } from '@/lib/admin-audit';
import {
  createTenantWithAdmin,
  isTenantPlan,
  type TenantPlan,
} from '@/lib/tenant-provision';

export async function GET() {
  const admin = await requirePlatformAdmin();
  if (isPlatformAdminResponse(admin)) return admin;

  try {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        isActive: true,
        createdAt: true,
        whatsappPhoneNumber: true,
        whatsappSetupComplete: true,
        whatsappProvider: true,
        _count: {
          select: {
            users: true,
            clients: true,
            conversations: true,
            documents: true,
            tasks: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: tenants });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch tenants';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST — provision a customer workspace + admin user (platform only).
 * Does not auto-login; returns created tenant metadata only.
 */
export async function POST(request: NextRequest) {
  const admin = await requirePlatformAdmin();
  if (isPlatformAdminResponse(admin)) return admin;

  try {
    const body = await request.json();
    const {
      firmName,
      fullName,
      email,
      password,
      plan = 'starter',
      settings,
    } = body as {
      firmName?: string;
      fullName?: string;
      email?: string;
      password?: string;
      plan?: string;
      settings?: Record<string, unknown>;
    };

    if (!firmName || !fullName || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: firmName, fullName, email, password' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    if (!isTenantPlan(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const result = await createTenantWithAdmin({
      firmName,
      fullName,
      email: email.toLowerCase().trim(),
      password,
      plan: plan as TenantPlan,
      settings,
    });

    await logAdminAction('CREATE_TENANT', result.tenant.id, {
      tenantSlug: result.tenant.slug,
      tenantName: result.tenant.name,
      plan: result.tenant.plan,
      adminEmail: result.user.email,
      provisionedBy: admin.email,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          tenant: result.tenant,
          adminUser: {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
          },
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to create tenant';
    const status = msg.includes('already exists') ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
