import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { AdminActionType } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  const tenantSlug = (session.user as { tenantSlug?: string }).tenantSlug;

  if (userRole !== 'administrator' || !['praxisone', 'mlk-computer-consulting'].includes(tenantSlug as string)) {
    return NextResponse.json({ error: "Forbidden: Platform Administrator access required" }, { status: 403 });
  }

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
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: tenant });
  } catch (error: unknown) {
    console.error("Error fetching tenant detail:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role;
  const tenantSlug = (session.user as { tenantSlug?: string }).tenantSlug;
  const adminId = (session.user as { id: string }).id;
  const adminEmail = session.user.email || 'unknown@admin.com';

  if (userRole !== 'administrator' || !['praxisone', 'mlk-computer-consulting'].includes(tenantSlug as string)) {
    return NextResponse.json({ error: "Forbidden: Platform Administrator access required" }, { status: 403 });
  }

  try {
    const { id } = await params;

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      select: { name: true, slug: true }
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    if (['praxisone', 'mlk-computer-consulting'].includes(tenant.slug)) {
       return NextResponse.json({ error: "Master tenants cannot be deleted" }, { status: 403 });
    }

    // Log the destruction action first (in case the delete cascades and something interrupts)
    await prisma.adminAuditLog.create({
      data: {
        action: 'DELETE_TENANT' as unknown as AdminActionType,
        adminId,
        adminEmail,
        targetId: id,
        details: JSON.stringify({ tenantName: tenant.name, tenantSlug: tenant.slug })
      }
    });

    // Execute the cascade delete
    await prisma.tenant.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Tenant and all associated data permanently deleted.' });
  } catch (error: unknown) {
    console.error("Error deleting tenant:", error);
    return NextResponse.json({ error: "Internal server error during deletion" }, { status: 500 });
  }
}
