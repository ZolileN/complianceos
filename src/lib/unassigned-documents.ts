import { prisma } from '@/lib/prisma';

/** Marker stored on the synthetic inbound-queue client (hidden from normal client lists). */
export const INBOUND_QUEUE_REGISTRATION = '__INBOUND_QUEUE__';

export function isInboundQueueClient(client: {
  registrationNumber?: string | null;
  companyName?: string | null;
}): boolean {
  return client.registrationNumber === INBOUND_QUEUE_REGISTRATION;
}

export function parseDocumentInboundMeta(ocrMetadata: string | null | undefined): {
  inboundEmailId?: string;
  inboundMessageId?: string;
  inboundWhatsappConversationId?: string;
  senderPhone?: string;
  source?: string;
  unassigned?: boolean;
} {
  if (!ocrMetadata) return {};
  try {
    const meta = JSON.parse(ocrMetadata) as Record<string, unknown>;
    return {
      inboundEmailId:
        typeof meta.inbound_email_id === 'string' ? meta.inbound_email_id : undefined,
      inboundMessageId:
        typeof meta.inbound_message_id === 'string' ? meta.inbound_message_id : undefined,
      inboundWhatsappConversationId:
        typeof meta.inbound_whatsapp_conversation_id === 'string'
          ? meta.inbound_whatsapp_conversation_id
          : undefined,
      senderPhone:
        typeof meta.sender_phone === 'string' ? meta.sender_phone : undefined,
      source: typeof meta.source === 'string' ? meta.source : undefined,
      unassigned: meta.unassigned === true || meta.unassigned === 'true',
    };
  } catch {
    return {};
  }
}

/** Synthetic client that holds unmatched inbound attachments until staff assign them. */
export async function getOrCreateInboundQueueClient(tenantId: string): Promise<string> {
  const existing = await prisma.client.findFirst({
    where: { tenantId, registrationNumber: INBOUND_QUEUE_REGISTRATION },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.client.create({
    data: {
      tenantId,
      companyName: '— Unassigned inbox —',
      registrationNumber: INBOUND_QUEUE_REGISTRATION,
      status: 'inactive',
      email: null,
    },
    select: { id: true },
  });
  return created.id;
}
