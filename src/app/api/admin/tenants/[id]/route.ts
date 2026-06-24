import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

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

  if (userRole !== 'administrator' || tenantSlug !== 'praxisone') {
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
