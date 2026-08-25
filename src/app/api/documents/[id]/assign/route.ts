import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { logAuditAction } from '@/lib/auditLogger';
import { evaluateWorkflowDocumentTriggers } from '@/lib/workflowEngine';
import { requireStaff } from '@/lib/rbac';
import {
  getOrCreateInboundQueueClient,
  parseDocumentInboundMeta,
} from '@/lib/unassigned-documents';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as { tenantId: string; role: string; id: string };
  const forbidden = requireStaff(currentUser);
  if (forbidden) return forbidden;

  const tenantId = currentUser.tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  let body: { clientId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const clientId = body.clientId?.trim();
  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }

  const queueClientId = await getOrCreateInboundQueueClient(tenantId);

  const document = await prisma.document.findFirst({
    where: { id, tenantId, clientId: queueClientId },
  });
  if (!document) {
    return NextResponse.json({ error: 'Unassigned document not found' }, { status: 404 });
  }

  const targetClient = await prisma.client.findFirst({
    where: { id: clientId, tenantId },
    select: { id: true, companyName: true },
  });
  if (!targetClient) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const inboundMeta = parseDocumentInboundMeta(document.ocrMetadata);
  let nextMetadata: Record<string, unknown> = {};
  if (document.ocrMetadata) {
    try {
      nextMetadata = JSON.parse(document.ocrMetadata) as Record<string, unknown>;
    } catch {
      nextMetadata = {};
    }
  }
  delete nextMetadata.unassigned;

  const updated = await prisma.document.update({
    where: { id },
    data: {
      clientId,
      ocrMetadata: JSON.stringify({
        ...nextMetadata,
        assigned_at: new Date().toISOString(),
        assigned_by: currentUser.id,
      }),
    },
  });

  if (inboundMeta.inboundEmailId) {
    await prisma.inboundEmail.updateMany({
      where: { id: inboundMeta.inboundEmailId, tenantId, clientId: null },
      data: { clientId },
    });
  }

  await logAuditAction({
    tenantId,
    userId: currentUser.id,
    action: 'UPDATE',
    entityType: 'Document',
    entityId: id,
    details: {
      assignedToClientId: clientId,
      assignedToClientName: targetClient.companyName,
      fromQueue: true,
    },
  });

  evaluateWorkflowDocumentTriggers(tenantId, clientId).catch((err: unknown) => {
    console.error('[AssignDocument] Workflow trigger failed:', err);
  });

  return NextResponse.json({
    success: true,
    data: {
      id: updated.id,
      client_id: updated.clientId,
      client_name: targetClient.companyName,
    },
  });
}
