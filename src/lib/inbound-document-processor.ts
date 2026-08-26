import { prisma } from '@/lib/prisma';
import { triggerOcrSimulation } from '@/app/api/documents/upload/route';
import {
  fetchReceivedAttachmentDownloadUrl,
  type InboundEmailAttachmentMeta,
} from '@/lib/inbound-email';
import { isLikelySarsInbound } from '@/lib/sars-document-parsers';
import { getOrCreateInboundQueueClient } from '@/lib/unassigned-documents';

const PDF_TYPES = new Set(['application/pdf', 'application/x-pdf']);

export type InboundAttachmentLike = {
  id: string;
  name: string;
  contentType: string;
  size?: number;
};

export type ProcessInboundAttachmentsResult = {
  processed: number;
  skipped: number;
  documentIds: string[];
};

function isPdfAttachment(attachment: InboundAttachmentLike): boolean {
  const type = attachment.contentType.toLowerCase();
  if (PDF_TYPES.has(type)) return true;
  return attachment.name.toLowerCase().endsWith('.pdf');
}

function guessCategoryFromName(name: string): string {
  const lower = name.toLowerCase();
  if (/ita\s*34|assessment/i.test(lower)) return 'sars_assessment';
  if (/vat\s*201|vat201/i.test(lower)) return 'sars_submission';
  if (/emp\s*201|emp201/i.test(lower)) return 'sars_submission';
  if (/sars|efiling/i.test(lower)) return 'sars_correspondence';
  return 'other';
}

function isLikelySarsContent(
  fromAddress: string,
  subject: string,
  bodyText: string,
  attachments: InboundAttachmentLike[]
): boolean {
  return (
    isLikelySarsInbound(fromAddress, subject, bodyText) ||
    attachments.some((a) => guessCategoryFromName(a.name) !== 'other')
  );
}

type CreateInboundDocumentOpts = {
  tenantId: string;
  targetClientId: string;
  unassigned: boolean;
  attachment: InboundAttachmentLike;
  filePath: string;
  ocrMetadata: Record<string, unknown>;
};

async function createInboundDocument(
  opts: CreateInboundDocumentOpts
): Promise<string | null> {
  const duplicate = await prisma.document.findFirst({
    where: {
      tenantId: opts.tenantId,
      clientId: opts.targetClientId,
      filePath: opts.filePath,
    },
    select: { id: true },
  });
  if (duplicate) return null;

  const category = guessCategoryFromName(opts.attachment.name);
  const doc = await prisma.document.create({
    data: {
      tenantId: opts.tenantId,
      clientId: opts.targetClientId,
      name: opts.attachment.name,
      filePath: opts.filePath,
      fileType: opts.attachment.contentType || 'application/pdf',
      category,
      version: 1,
      fileSize: opts.attachment.size ? BigInt(opts.attachment.size) : BigInt(0),
      ocrStatus: 'pending',
      ocrMetadata: JSON.stringify(opts.ocrMetadata),
    },
    select: { id: true },
  });

  triggerOcrSimulation(doc.id).catch((err: unknown) => {
    console.error('[InboundProcessor] OCR failed for', doc.id, err);
  });

  return doc.id;
}

/**
 * Auto-save inbound PDF attachments to the document vault and queue OCR.
 * Matched clients get documents directly; unmatched go to the inbound queue client.
 */
export async function processInboundEmailAttachments(opts: {
  tenantId: string;
  inboundEmailId: string;
  messageId: string | null;
  clientId: string | null;
  fromAddress: string;
  subject: string;
  bodyText: string;
  attachments: InboundEmailAttachmentMeta[];
}): Promise<ProcessInboundAttachmentsResult> {
  const pdfAttachments = opts.attachments.filter(isPdfAttachment);
  if (pdfAttachments.length === 0) {
    return { processed: 0, skipped: 0, documentIds: [] };
  }

  if (!isLikelySarsContent(opts.fromAddress, opts.subject, opts.bodyText, pdfAttachments)) {
    return { processed: 0, skipped: pdfAttachments.length, documentIds: [] };
  }

  const targetClientId =
    opts.clientId ?? (await getOrCreateInboundQueueClient(opts.tenantId));
  const unassigned = !opts.clientId;

  const documentIds: string[] = [];
  let skipped = 0;

  for (const attachment of pdfAttachments) {
    const filePath = `/api/emails/${opts.inboundEmailId}/attachments/${attachment.id}`;

    if (opts.messageId) {
      const downloadable = await fetchReceivedAttachmentDownloadUrl(
        opts.messageId,
        attachment.id
      );
      if (!downloadable) {
        skipped += 1;
        continue;
      }
    }

    const docId = await createInboundDocument({
      tenantId: opts.tenantId,
      targetClientId,
      unassigned,
      attachment,
      filePath,
      ocrMetadata: {
        inbound_email_id: opts.inboundEmailId,
        unassigned,
        source: 'inbound_email',
      },
    });

    if (docId) {
      documentIds.push(docId);
    } else {
      skipped += 1;
    }
  }

  return {
    processed: documentIds.length,
    skipped,
    documentIds,
  };
}

export type WhatsAppMediaAttachment = {
  mediaUrl: string;
  contentType: string;
  fileName?: string;
};

/**
 * Auto-save inbound WhatsApp PDF attachments to the document vault and queue OCR.
 */
export async function processInboundWhatsAppAttachments(opts: {
  tenantId: string;
  messageId: string;
  conversationId: string;
  clientId: string | null;
  senderPhone: string;
  bodyText: string;
  attachments: WhatsAppMediaAttachment[];
}): Promise<ProcessInboundAttachmentsResult> {
  const pdfAttachments = opts.attachments
    .map((a, index) => ({
      id: `wa-${opts.messageId}-${index}`,
      name: a.fileName || `whatsapp-document-${index + 1}.pdf`,
      contentType: a.contentType,
    }))
    .filter(isPdfAttachment);

  if (pdfAttachments.length === 0) {
    return { processed: 0, skipped: 0, documentIds: [] };
  }

  if (
    !isLikelySarsContent(opts.senderPhone, '', opts.bodyText, pdfAttachments)
  ) {
    return { processed: 0, skipped: pdfAttachments.length, documentIds: [] };
  }

  const targetClientId =
    opts.clientId ?? (await getOrCreateInboundQueueClient(opts.tenantId));
  const unassigned = !opts.clientId;

  const documentIds: string[] = [];
  let skipped = 0;

  for (let index = 0; index < pdfAttachments.length; index++) {
    const attachment = pdfAttachments[index];
    const media = opts.attachments[index];
    const filePath = `/api/whatsapp/media/${encodeURIComponent(media.mediaUrl)}`;

    const docId = await createInboundDocument({
      tenantId: opts.tenantId,
      targetClientId,
      unassigned,
      attachment,
      filePath,
      ocrMetadata: {
        inbound_message_id: opts.messageId,
        inbound_whatsapp_conversation_id: opts.conversationId,
        sender_phone: opts.senderPhone,
        unassigned,
        source: 'inbound_whatsapp',
      },
    });

    if (docId) {
      documentIds.push(docId);
    } else {
      skipped += 1;
    }
  }

  return {
    processed: documentIds.length,
    skipped,
    documentIds,
  };
}
