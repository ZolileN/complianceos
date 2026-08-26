import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { requireStaff } from '@/lib/rbac';
import {
  getOrCreateInboundQueueClient,
  parseDocumentInboundMeta,
} from '@/lib/unassigned-documents';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as { tenantId: string; role: string; id: string };
  const forbidden = requireStaff(currentUser);
  if (forbidden) return forbidden;

  const tenantId = currentUser.tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const queueClientId = await getOrCreateInboundQueueClient(tenantId);

  const docs = await prisma.document.findMany({
    where: {
      tenantId,
      clientId: queueClientId,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const inboundIds = [
    ...new Set(
      docs
        .map((d) => parseDocumentInboundMeta(d.ocrMetadata).inboundEmailId)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const messageIds = [
    ...new Set(
      docs
        .map((d) => parseDocumentInboundMeta(d.ocrMetadata).inboundMessageId)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const emails =
    inboundIds.length > 0
      ? await prisma.inboundEmail.findMany({
          where: { id: { in: inboundIds }, tenantId },
          select: {
            id: true,
            fromAddress: true,
            subject: true,
            receivedAt: true,
          },
        })
      : [];

  const messages =
    messageIds.length > 0
      ? await prisma.message.findMany({
          where: { id: { in: messageIds }, tenantId },
          select: {
            id: true,
            content: true,
            createdAt: true,
            conversation: {
              select: { whatsappNumber: true },
            },
          },
        })
      : [];

  const emailById = new Map(emails.map((e) => [e.id, e]));
  const messageById = new Map(messages.map((m) => [m.id, m]));

  const data = docs.map((doc) => {
    const inboundMeta = parseDocumentInboundMeta(doc.ocrMetadata);
    const email = inboundMeta.inboundEmailId
      ? emailById.get(inboundMeta.inboundEmailId)
      : undefined;
    const message = inboundMeta.inboundMessageId
      ? messageById.get(inboundMeta.inboundMessageId)
      : undefined;

    const source = inboundMeta.source || (email ? 'inbound_email' : message ? 'inbound_whatsapp' : 'unknown');

    return {
      id: doc.id,
      name: doc.name,
      category: doc.category,
      file_path: doc.filePath,
      file_type: doc.fileType,
      ocr_status: doc.ocrStatus,
      created_at: doc.createdAt,
      source,
      inbound_email_id: inboundMeta.inboundEmailId,
      inbound_message_id: inboundMeta.inboundMessageId,
      from_address:
        email?.fromAddress ||
        inboundMeta.senderPhone ||
        message?.conversation.whatsappNumber,
      subject: email?.subject || (message ? message.content : undefined),
      received_at: email?.receivedAt || message?.createdAt,
    };
  });

  return NextResponse.json({ data, count: data.length, queue_client_id: queueClientId });
}
