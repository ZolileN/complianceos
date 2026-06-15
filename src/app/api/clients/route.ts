import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = (session.user as { tenantId: string }).tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const includeInactive = searchParams.get('include_inactive') === 'true';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  const where = {
    tenantId,
    ...(search ? { companyName: { contains: search } } : {}),
    ...(!includeInactive ? { status: { not: 'inactive' } } : {}),
  };

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

  const tenantId = (session.user as { tenantId: string }).tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const body = await request.json();
  try {
    const client = await prisma.client.create({
      data: {
        companyName: body.company_name,
        registrationNumber: body.registration_number,
        taxNumber: body.tax_number,
        vatNumber: body.vat_number,
        email: body.email,
        phone: body.phone,
        whatsappNumber: body.whatsapp_number,
        directors: body.directors ? JSON.stringify(body.directors) : '[]',
        status: body.status || 'active',
        assignedConsultantId: body.assigned_consultant_id || null,
        tenantId,
      }
    });
    return NextResponse.json({ data: client }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
