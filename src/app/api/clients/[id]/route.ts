import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { logAuditAction } from '@/lib/auditLogger';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const currentUser = session.user as { tenantId: string; role: string; email: string; id: string };
  const tenantId = currentUser.tenantId;

  try {
    const client = await prisma.client.findFirst({
      where: { id, tenantId },
      include: {
        assignedConsultant: { select: { id: true, name: true } }
      }
    });
    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    // Role-based authorization checks
    if (currentUser.role === 'client' && client.email !== currentUser.email) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (currentUser.role === 'consultant' && client.assignedConsultantId !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const mappedData = {
      ...client,
      assigned_consultant: client.assignedConsultant ? {
        id: client.assignedConsultant.id,
        name: client.assignedConsultant.name,
        full_name: client.assignedConsultant.name,
      } : null,
      assigned_consultant_id: client.assignedConsultantId,
      company_name: client.companyName,
      registration_number: client.registrationNumber,
      tax_number: client.taxNumber,
      vat_number: client.vatNumber,
      whatsapp_number: client.whatsappNumber,
      address: client.address,
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
  const currentUser = session.user as { tenantId: string; role: string; email: string; id: string };
  const tenantId = currentUser.tenantId;

  // Clients cannot modify anything
  if (currentUser.role === 'client') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    // Check if client exists and is assigned (if consultant)
    const existing = await prisma.client.findFirst({
      where: { id, tenantId }
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (currentUser.role === 'consultant' && existing.assignedConsultantId !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    if (body.assigned_consultant_id !== undefined) {
      if (currentUser.role === 'consultant') {
        return NextResponse.json({ error: 'Consultants cannot change the assigned consultant' }, { status: 403 });
      }
      if (body.assigned_consultant_id) {
        const assignedUser = await prisma.user.findFirst({
          where: { id: body.assigned_consultant_id, tenantId }
        });
        if (!assignedUser) {
          return NextResponse.json({ error: 'Assigned consultant not found in this tenant' }, { status: 400 });
        }
      }
    }

    const data: Record<string, unknown> = {};
    if (body.company_name !== undefined) data.companyName = body.company_name;
    if (body.status !== undefined) data.status = body.status;
    if (body.registration_number !== undefined) data.registrationNumber = body.registration_number;
    if (body.tax_number !== undefined) data.taxNumber = body.tax_number;
    if (body.vat_number !== undefined) data.vatNumber = body.vat_number;
    if (body.email !== undefined) data.email = body.email;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.whatsapp_number !== undefined) data.whatsappNumber = body.whatsapp_number;
    if (body.address !== undefined) data.address = body.address;
    if (body.assigned_consultant_id !== undefined) data.assignedConsultantId = body.assigned_consultant_id || null;
    if (body.directors !== undefined) {
      data.directors = typeof body.directors === 'string' ? body.directors : JSON.stringify(body.directors);
    }
    
    const client = await prisma.client.update({
      where: { id, tenantId },
      data,
      include: {
        assignedConsultant: { select: { id: true, name: true } }
      }
    });

    const mappedData = {
      ...client,
      assigned_consultant: client.assignedConsultant ? {
        id: client.assignedConsultant.id,
        name: client.assignedConsultant.name,
        full_name: client.assignedConsultant.name,
      } : null,
      assigned_consultant_id: client.assignedConsultantId,
      company_name: client.companyName,
      registration_number: client.registrationNumber,
      tax_number: client.taxNumber,
      vat_number: client.vatNumber,
      whatsapp_number: client.whatsappNumber,
      address: client.address,
      created_at: client.createdAt,
    };

    await logAuditAction({
      tenantId,
      userId: currentUser.id,
      action: 'UPDATE',
      entityType: 'Client',
      entityId: id,
      details: { companyName: client.companyName },
    });

    return NextResponse.json({ data: mappedData });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const currentUser = session.user as { tenantId: string; role: string; email: string; id: string };
  const tenantId = currentUser.tenantId;

  // Only administrators and operations managers can archive/delete clients
  if (currentUser.role !== 'administrator' && currentUser.role !== 'operations_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const clientToArchive = await prisma.client.findUnique({
      where: { id, tenantId },
      select: { companyName: true }
    });

    if (!clientToArchive) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.client.update({
      where: { id, tenantId },
      data: { status: 'inactive' }
    });

    await logAuditAction({
      tenantId,
      userId: currentUser.id,
      action: 'DELETE',
      entityType: 'Client',
      entityId: id,
      details: { companyName: clientToArchive.companyName, status: 'inactive' },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
