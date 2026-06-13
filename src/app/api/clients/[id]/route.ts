import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = (session.user as { tenantId: string }).tenantId;

  try {
    const client = await prisma.client.findFirst({
      where: { id, tenantId }
    });
    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    const mappedData = {
      ...client,
      company_name: client.companyName,
      registration_number: client.registrationNumber,
      tax_number: client.taxNumber,
      vat_number: client.vatNumber,
      whatsapp_number: client.whatsappNumber,
      created_at: client.createdAt,
    };
    return NextResponse.json({ data: mappedData });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = (session.user as { tenantId: string }).tenantId;

  const body = await request.json();
  try {
    const data: Record<string, unknown> = {};
    if (body.company_name) data.companyName = body.company_name;
    if (body.status) data.status = body.status;
    
    const client = await prisma.client.update({
      where: { id, tenantId },
      data
    });
    return NextResponse.json({ data: client });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = (session.user as { tenantId: string }).tenantId;

  try {
    await prisma.client.update({
      where: { id, tenantId },
      data: { status: 'inactive' }
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
