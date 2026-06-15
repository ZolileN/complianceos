import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email, password, firmName, fullName } = await req.json();

    if (!email || !password || !firmName || !fullName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "User already exists with this email" }, { status: 400 });
    }

    // Create Slug
    const slug = firmName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Check if tenant slug already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug },
    });

    if (existingTenant) {
      return NextResponse.json({ error: "A firm with this name already exists" }, { status: 400 });
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Tenant and User in a transaction
    await prisma.$transaction(async (tx) => {
      const newTenant = await tx.tenant.create({
        data: {
          name: firmName,
          slug,
          plan: "starter",
        },
      });

      return await tx.user.create({
        data: {
          email,
          name: fullName,
          password: hashedPassword,
          role: "administrator",
          tenantId: newTenant.id,
        },
      });
    });

    return NextResponse.json({ message: "Workspace created successfully" }, { status: 201 });
  } catch (error: unknown) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Something went wrong during registration" }, { status: 500 });
  }
}
