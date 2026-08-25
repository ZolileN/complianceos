import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emitSkillEvent } from '@/lib/skill-triggers';
import {
  collectRecipientAddresses,
  fetchReceivedEmailAttachments,
  fetchReceivedEmailContent,
  normalizeEmailAddress,
  parseTenantSlugFromRecipients,
  type ResendReceivedMeta,
} from '@/lib/inbound-email';
import { isLikelySarsInbound } from '@/lib/sars-document-parsers';
import { matchClientFromInboundText } from '@/lib/inbound-sars-routing';

type ResendInboundPayload = {
  type?: string;
  data?: ResendReceivedMeta;
};

export async function POST(request: NextRequest) {
  try {
    let payload: ResendInboundPayload;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Ignore non-inbound events (domain.updated, contact.*, etc.)
    if (payload.type !== 'email.received' || !payload.data) {
      return NextResponse.json({ received: true, skipped: true, type: payload.type });
    }

    const data = payload.data;
    const recipients = collectRecipientAddresses(data);
    const slug = parseTenantSlugFromRecipients(recipients);

    if (!slug) {
      console.warn('Inbound email: no tenant slug in recipients', recipients);
      return NextResponse.json(
        { error: 'Unknown recipient', recipients },
        { status: 422 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, slug: true },
    });
    if (!tenant) {
      console.warn(`Inbound email: tenant not found for slug "${slug}"`);
      return NextResponse.json({ error: 'Tenant not found', slug }, { status: 404 });
    }

    const fromAddress = normalizeEmailAddress(data.from || 'unknown');
    let matchedClient = await prisma.client.findFirst({
      where: {
        tenantId: tenant.id,
        email: { equals: fromAddress, mode: 'insensitive' },
      },
      select: { id: true },
    });

    const subject = data.subject || '';
    const previewText = data.text || '';

    if (!matchedClient && isLikelySarsInbound(fromAddress, subject, previewText)) {
      const sarsClientId = await matchClientFromInboundText(
        tenant.id,
        `${subject}\n${previewText}`,
        undefined
      );
      if (sarsClientId) {
        matchedClient = { id: sarsClientId };
      }
    }

    const messageId = data.email_id || null;
    if (messageId) {
      const dup = await prisma.inboundEmail.findUnique({ where: { messageId } });
      if (dup) return NextResponse.json({ received: true, duplicate: true, id: dup.id });
    }

    let bodyText = data.text || null;
    let bodyHtml = data.html || null;
    let headersJson = data.headers ? JSON.stringify(data.headers) : null;

    if (messageId && (!bodyText && !bodyHtml)) {
      const content = await fetchReceivedEmailContent(messageId);
      if (content) {
        bodyText = content.text || bodyText;
        bodyHtml = content.html || bodyHtml;
        if (content.headers) headersJson = JSON.stringify(content.headers);
      }
    }

    let attachmentMeta = (data.attachments || []).map((a) => ({
      id: a.id,
      name: a.filename,
      contentType: a.content_type,
    })).filter((a) => a.id);

    if (messageId) {
      const fromApi = await fetchReceivedEmailAttachments(messageId);
      if (fromApi.length > 0) {
        attachmentMeta = fromApi.map((a) => ({
          id: a.id,
          name: a.name,
          contentType: a.contentType,
          size: a.size,
        }));
      }
    }

    const email = await prisma.inboundEmail.create({
      data: {
        tenantId: tenant.id,
        clientId: matchedClient?.id || null,
        fromAddress,
        toAddress: recipients[0] || '',
        subject: data.subject || null,
        bodyText,
        bodyHtml,
        messageId,
        headers: headersJson,
        attachments: JSON.stringify(
          attachmentMeta.map((a) => ({
            id: a.id,
            name: a.name,
            contentType: a.contentType,
            size: 'size' in a ? a.size : undefined,
          }))
        ),
      },
    });

    await emitSkillEvent(tenant.id, 'message.received', 'system', 'system', {
      channel: 'email',
      inboundEmailId: email.id,
      from: fromAddress,
      subject: data.subject,
      clientId: matchedClient?.id,
    });

    return NextResponse.json({ received: true, id: email.id, tenantSlug: tenant.slug });
  } catch (error) {
    console.error('Resend inbound webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
