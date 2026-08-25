import { prisma } from '@/lib/prisma';
import { triggerOcrSimulation } from '@/app/api/documents/upload/route';
import {
  fetchReceivedAttachmentDownloadUrl,
  type InboundEmailAttachmentMeta,
} from '@/lib/inbound-email';
import { isLikelySarsInbound } from '@/lib/sars-document-parsers';
import { getOrCreateInboundQueueClient } from '@/lib/unassigned-documents';

const PDF_TYPES = new Set([
  'application/pdf',
  'application/x-pdf',
]);

function isPdfAttachment(attachment: InboundEmailAttachmentMeta): boolean {
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

export type ProcessInboundAttachmentsResult = {
  processed: number;
  skipped: number;
  documentIds: string[];
};

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

  const isSars =
    isLikelySarsInbound(opts.fromAddress, opts.subject, opts.bodyText) ||
    pdfAttachments.some((a) => guessCategoryFromName(a.name) !== 'other');

  if (!isSars) {
    return { processed: 0, skipped: pdfAttachments.length, documentIds: [] };
  }

  const targetClientId =
    opts.clientId ?? (await getOrCreateInboundQueueClient(opts.tenantId));
  const unassigned = !opts.clientId;

  const documentIds: string[] = [];
  let skipped = 0;

  for (const attachment of pdfAttachments) {
    const filePath = `/api/emails/${opts.inboundEmailId}/attachments/${attachment.id}`;

    const duplicate = await prisma.document.findFirst({
      where: {
        tenantId: opts.tenantId,
        clientId: targetClientId,
        filePath,
      },
      select: { id: true },
    });
    if (duplicate) {
      skipped += 1;
      continue;
    }

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

    const category = guessCategoryFromName(attachment.name);
    const doc = await prisma.document.create({
      data: {
        tenantId: opts.tenantId,
        clientId: targetClientId,
        name: attachment.name,
        filePath,
        fileType: attachment.contentType || 'application/pdf',
        category,
        version: 1,
        fileSize: attachment.size ? BigInt(attachment.size) : BigInt(0),
        ocrStatus: 'pending',
        ocrMetadata: JSON.stringify({
          inbound_email_id: opts.inboundEmailId,
          unassigned,
          source: 'inbound_email',
        }),
      },
      select: { id: true },
    });

    documentIds.push(doc.id);
    triggerOcrSimulation(doc.id).catch((err: unknown) => {
      console.error('[InboundProcessor] OCR failed for', doc.id, err);
    });
  }

  return {
    processed: documentIds.length,
    skipped,
    documentIds,
  };
}
