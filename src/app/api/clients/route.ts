import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { Prisma } from '@prisma/client';
import { logAuditAction } from '@/lib/auditLogger';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as { tenantId: string; role: string; email: string; id: string };
  const tenantId = currentUser.tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const includeInactive = searchParams.get('include_inactive') === 'true';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  const where: Prisma.ClientWhereInput = {
    tenantId,
    ...(search ? { companyName: { contains: search } } : {}),
    ...(!includeInactive ? { status: { not: 'inactive' } } : {}),
  };

  // Role-based restrictions
  if (currentUser.role === 'client') {
    where.email = currentUser.email;
  } else if (currentUser.role === 'consultant') {
    where.assignedConsultantId = currentUser.id;
  }

  try {
    const data = await prisma.client.findMany({
      where,
      include: {
        assignedConsultant: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    const count = await prisma.client.count({ where });

    // Map Prisma schema back to the shape expected by UI
    const mappedData = data.map(client => ({
      ...client,
      assigned_consultant: client.assignedConsultant ? {
        id: client.assignedConsultant.id,
        name: client.assignedConsultant.name,
        full_name: client.assignedConsultant.name,
      } : null,
      company_name: client.companyName,
      registration_number: client.registrationNumber,
      tax_number: client.taxNumber,
      vat_number: client.vatNumber,
      whatsapp_number: client.whatsappNumber,
      address: client.address,
      created_at: client.createdAt,
    }));

    return NextResponse.json({ data: mappedData, count });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as { tenantId: string; role: string; id: string };
  const tenantId = currentUser.tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  // Only administrators and operations managers can create clients
  if (currentUser.role !== 'administrator' && currentUser.role !== 'operations_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  try {
    if (body.assigned_consultant_id) {
      const assignedUser = await prisma.user.findFirst({
        where: { id: body.assigned_consultant_id, tenantId }
      });
      if (!assignedUser) {
        return NextResponse.json({ error: 'Assigned consultant not found in this tenant' }, { status: 400 });
      }
    }
    const client = await prisma.client.create({
      data: {
        companyName: body.company_name,
        registrationNumber: body.registration_number,
        taxNumber: body.tax_number,
        vatNumber: body.vat_number,
        email: body.email,
        phone: body.phone,
        whatsappNumber: body.whatsapp_number,
        address: body.address,
        directors: body.directors ? JSON.stringify(body.directors) : '[]',
        status: body.status || 'active',
        assignedConsultantId: body.assigned_consultant_id || null,
        tenantId,
      }
    });

    // Log the creation
    await logAuditAction({
      tenantId,
      userId: currentUser.id,
      action: 'CREATE',
      entityType: 'Client',
      entityId: client.id,
      details: { companyName: client.companyName },
    });

    return NextResponse.json({ data: client }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
