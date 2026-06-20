import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { logAuditAction } from '@/lib/auditLogger';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const currentUser = session.user as { tenantId: string; role: string; email: string; id: string };
  const tenantId = currentUser.tenantId;

  try {
    const document = await prisma.document.findFirst({
      where: { id, tenantId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        client: {
          select: {
            id: true,
            companyName: true,
            registrationNumber: true,
            taxNumber: true,
            vatNumber: true,
            email: true
          }
        }
      }
    });

    if (!document) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Client role can only view their own documents
    if (currentUser.role === 'client') {
      const client = await prisma.client.findFirst({
        where: { tenantId, email: currentUser.email }
      });
      if (!client || document.clientId !== client.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Auto-trigger OCR if it was never run
    if (document.ocrStatus === 'none') {
      await prisma.document.update({
        where: { id: document.id },
        data: { ocrStatus: 'pending' }
      });
      document.ocrStatus = 'pending';

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { triggerOcrSimulation } = require('../upload/route');
      triggerOcrSimulation(document.id).catch((err: unknown) => {
        console.error("Auto-triggered OCR failed:", err);
      });
    }

    const mappedDocument = {
      id: document.id,
      client_id: document.clientId,
      tenant_id: document.tenantId,
      name: document.name,
      file_path: document.filePath,
      file_type: document.fileType,
      category: document.category,
      version: document.version,
      file_size: Number(document.fileSize),
      ocr_status: document.ocrStatus,
      ocr_text: document.ocrText,
      ocr_metadata: document.ocrMetadata,
      uploaded_by: document.uploadedById,
      uploader: document.uploadedBy ? {
        id: document.uploadedBy.id,
        full_name: document.uploadedBy.name || '',
        email: document.uploadedBy.email || '',
        role: 'consultant'
      } : undefined,
      client: document.client ? {
        id: document.client.id,
        company_name: document.client.companyName,
        registration_number: document.client.registrationNumber || undefined,
        tax_number: document.client.taxNumber || undefined,
        vat_number: document.client.vatNumber || undefined
      } : undefined,
      versions: document.versions.map(v => ({
        id: v.id,
        document_id: v.documentId,
        version: v.version,
        file_path: v.filePath,
        file_type: v.fileType || '',
        file_size: Number(v.fileSize),
        uploaded_by: v.uploadedById,
        uploader: v.uploadedBy ? {
          id: v.uploadedBy.id,
          full_name: v.uploadedBy.name || '',
          email: v.uploadedBy.email || '',
          role: 'consultant'
        } : undefined,
        created_at: v.createdAt.toISOString()
      })),
      created_at: document.createdAt.toISOString()
    };

    return NextResponse.json({ data: mappedDocument });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const currentUser = session.user as { tenantId: string; role: string; id: string };
  const tenantId = currentUser.tenantId;

  // Clients cannot modify document records directly
  if (currentUser.role === 'client') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const existingDoc = await prisma.document.findFirst({
      where: { id, tenantId },
      include: { client: true }
    });
    if (!existingDoc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Consultants can only modify documents of their assigned clients
    if (currentUser.role === 'consultant' && existingDoc.client?.assignedConsultantId !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.name) data.name = body.name;

    let categoryChanged = false;
    if (body.category) {
      data.category = body.category;
      if (body.category !== existingDoc.category) {
        categoryChanged = true;
        data.ocrStatus = 'pending';
        data.ocrText = null;
        data.ocrMetadata = null;
      }
    }
    
    const document = await prisma.document.update({
      where: { id, tenantId },
      data
    });

    if (categoryChanged) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { triggerOcrSimulation } = require('../upload/route');
      triggerOcrSimulation(document.id).catch((err: unknown) => {
        console.error("Re-triggered OCR failed:", err);
      });
    }
    
    const mappedDoc = { ...document, fileSize: Number(document.fileSize) };

    await logAuditAction({
      tenantId,
      userId: currentUser.id,
      action: 'UPDATE',
      entityType: 'Document',
      entityId: id,
      details: { name: document.name, category: document.category, categoryChanged },
    });

    return NextResponse.json({ data: mappedDoc });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const currentUser = session.user as { tenantId: string; role: string; id: string };
  const tenantId = currentUser.tenantId;

  // Only administrators and operations managers can delete/remove documents
  if (currentUser.role !== 'administrator' && currentUser.role !== 'operations_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const documentToDelete = await prisma.document.findUnique({
      where: { id, tenantId },
      select: { name: true }
    });

    if (!documentToDelete) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    await prisma.document.delete({
      where: { id, tenantId }
    });

    await logAuditAction({
      tenantId,
      userId: currentUser.id,
      action: 'DELETE',
      entityType: 'Document',
      entityId: id,
      details: { title: documentToDelete.name },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
