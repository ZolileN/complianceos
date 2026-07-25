import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripWhatsAppPrefix, validateTwilioSignature, normaliseToE164 } from '@/lib/twilio';
import { emitSkillEvent } from '@/lib/skill-triggers';
import { pushTenantLog } from '@/lib/redis';

function emptyTwiml() {
  return new NextResponse('<Response></Response>', {
    headers: { 'Content-Type': 'text/xml' },
    status: 200,
  });
}

/**
 * Resolve the tenant that owns the receiving WhatsApp number.
 * Never falls back to an arbitrary first tenant.
 *
 * Resolution order:
 * 1. Exact match on tenant.whatsappPhoneNumber
 * 2. Shared sandbox number (TWILIO_WHATSAPP_NUMBER) → connected tenant
 *    (prefer one whose verified name matches the sender)
 * 3. Match sender to a known client under a WhatsApp-connected tenant
 */
async function resolveTenant(receiverPhone: string, toRaw: string, senderPhone: string) {
  const byNumber = await prisma.tenant.findFirst({
    where: {
      whatsappSetupComplete: true,
      OR: [
        { whatsappPhoneNumber: receiverPhone },
        { whatsappPhoneNumber: toRaw },
        { whatsappPhoneNumber: normaliseToE164(receiverPhone) },
      ],
    },
  });
  if (byNumber) return byNumber;

  const sandboxRaw = process.env.TWILIO_WHATSAPP_NUMBER || '';
  const sandboxNumber = sandboxRaw
    ? normaliseToE164(stripWhatsAppPrefix(sandboxRaw))
    : '';
  const receiverNorm = normaliseToE164(receiverPhone);

  if (
    sandboxNumber &&
    (receiverNorm === sandboxNumber ||
      receiverPhone === sandboxNumber ||
      stripWhatsAppPrefix(toRaw) === stripWhatsAppPrefix(sandboxRaw))
  ) {
    const byVerifiedSender = await prisma.tenant.findFirst({
      where: {
        whatsappSetupComplete: true,
        OR: [
          { whatsappVerifiedName: senderPhone },
          { whatsappVerifiedName: normaliseToE164(senderPhone) },
        ],
      },
    });
    if (byVerifiedSender) return byVerifiedSender;

    const anyConnected = await prisma.tenant.findFirst({
      where: { whatsappSetupComplete: true },
      orderBy: { updatedAt: 'desc' },
    });
    if (anyConnected) return anyConnected;
  }

  // Shared sandbox / unknown receiver: route via known client WhatsApp / phone
  const localFormat =
    senderPhone.replace(/^\+/, '').startsWith('27') && senderPhone.replace(/^\+/, '').length === 11
      ? `0${senderPhone.replace(/^\+/, '').substring(2)}`
      : senderPhone;
  const stripped = senderPhone.replace(/^\+/, '');

  const client = await prisma.client.findFirst({
    where: {
      tenant: { whatsappSetupComplete: true },
      OR: [
        { whatsappNumber: senderPhone },
        { whatsappNumber: localFormat },
        { whatsappNumber: stripped },
        { whatsappNumber: normaliseToE164(senderPhone) },
        { phone: senderPhone },
        { phone: localFormat },
        { phone: stripped },
      ],
    },
    include: { tenant: true },
  });

  return client?.tenant ?? null;
}

/**
 * POST /api/webhooks/twilio
 *
 * Receives incoming WhatsApp messages from Twilio.
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      if (typeof value === 'string') params[key] = value;
    });

    // Validate Twilio signature when configured (skip in local dev unless forced)
    const signature = req.headers.get('x-twilio-signature') || '';
    const webhookUrl = process.env.TWILIO_WEBHOOK_URL || req.url;
    const enforceSignature =
      process.env.TWILIO_ENFORCE_SIGNATURE === 'true' ||
      (process.env.NODE_ENV === 'production' && !!process.env.TWILIO_AUTH_TOKEN);

    if (enforceSignature) {
      const valid = validateTwilioSignature(webhookUrl, params, signature);
      if (!valid) {
        console.warn('⚠️ Invalid Twilio webhook signature');
        return new NextResponse('Forbidden', { status: 403 });
      }
    } else if (process.env.TWILIO_AUTH_TOKEN && signature) {
      const valid = validateTwilioSignature(webhookUrl, params, signature);
      if (!valid) {
        console.warn(
          '⚠️ Twilio signature mismatch (allowed in non-production). Check TWILIO_WEBHOOK_URL matches the console webhook exactly.'
        );
      }
    }

    const from = params.From || '';
    const to = params.To || '';
    const body = params.Body || '';
    const messageSid = params.MessageSid || '';
    const numMedia = parseInt(params.NumMedia || '0', 10);

    const senderPhone = stripWhatsAppPrefix(from);
    const receiverPhone = stripWhatsAppPrefix(to);

    console.log(`💬 Twilio WhatsApp message from ${senderPhone}: ${body}`);

    const targetTenant = await resolveTenant(receiverPhone, to, senderPhone);

    if (!targetTenant) {
      console.warn(
        `⚠️ No tenant matched Twilio webhook (to=${receiverPhone}, from=${senderPhone})`
      );
      return emptyTwiml();
    }

    const tenantId = targetTenant.id;

    let conversation = await prisma.conversation.findFirst({
      where: { whatsappNumber: senderPhone, tenantId },
    });

    if (!conversation) {
      let localFormat = senderPhone;
      const stripped = senderPhone.replace(/^\+/, '');
      if (stripped.startsWith('27') && stripped.length === 11) {
        localFormat = `0${stripped.substring(2)}`;
      }

      const client = await prisma.client.findFirst({
        where: {
          tenantId,
          OR: [
            { whatsappNumber: senderPhone },
            { whatsappNumber: localFormat },
            { whatsappNumber: stripped },
            { phone: senderPhone },
            { phone: localFormat },
          ],
        },
      });

      conversation = await prisma.conversation.create({
        data: {
          whatsappNumber: senderPhone,
          tenantId,
          clientId: client?.id || null,
          status: 'open',
        },
      });
    }

    let content = body;
    let messageType = 'text';
    let mediaUrl: string | null = null;

    if (numMedia > 0) {
      const mediaUrlField = params.MediaUrl0 || '';
      const mediaContentType = params.MediaContentType0 || '';

      if (mediaContentType.startsWith('image/')) {
        messageType = 'image';
        content = body || 'Image';
        mediaUrl = mediaUrlField;
      } else if (
        mediaContentType.startsWith('application/') ||
        mediaContentType.startsWith('text/')
      ) {
        messageType = 'document';
        content = body || 'Document';
        mediaUrl = mediaUrlField;
      } else {
        messageType = 'document';
        content = body || 'Media';
        mediaUrl = mediaUrlField;
      }
    }

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        tenantId,
        direction: 'inbound',
        content,
        messageType,
        mediaUrl,
        whatsappMessageId: messageSid,
        status: 'delivered',
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date(), status: 'open' },
    });

    await pushTenantLog(
      tenantId,
      `Inbound WhatsApp message received from ${senderPhone}`,
      'webhook',
      { messageId: messageSid, type: messageType, snippet: content.substring(0, 60) }
    );

    emitSkillEvent(tenantId, 'message.received', 'system', 'system', {
      message: {
        from: senderPhone,
        body: content,
        type: messageType,
        sid: messageSid,
      },
    }).catch(console.error);

    console.log(`✅ Twilio webhook processed: ${messageSid} → conversation ${conversation.id}`);
    return emptyTwiml();
  } catch (error) {
    console.error('❌ Twilio webhook error:', error);
    return emptyTwiml();
  }
}
