import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { markAsRead } from '@/lib/whatsapp';
import { AdminLogger } from '@/lib/admin-logs';

/**
 * GET — Meta webhook verification (challenge-response)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

/**
 * POST — Incoming message handler
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  
  AdminLogger.log('webhook', 'Meta Webhook (WA_EMBEDDED_SIGNUP or Message Event)', body);

  if (!body.entry?.[0]?.changes?.[0]?.value) {
    return NextResponse.json({ status: 'ok' });
  }

  const value = body.entry[0].changes[0].value;

  // Handle message status updates
  if (value.statuses) {
    for (const status of value.statuses) {
      await prisma.message.updateMany({
        where: { whatsappMessageId: status.id },
        data: { status: status.status }
      });
    }
    return NextResponse.json({ status: 'ok' });
  }

  // Handle incoming messages
  if (!value.messages) {
    return NextResponse.json({ status: 'ok' });
  }

  // Find target tenant based on receiving phone number ID
  const receivingPhoneNumberId = value.metadata?.phone_number_id;
  let targetTenant = null;
  if (receivingPhoneNumberId) {
    targetTenant = await prisma.tenant.findFirst({
      where: { whatsappPhoneNumberId: receivingPhoneNumberId }
    });
  }

  const defaultTenant = await prisma.tenant.findFirst();
  const tenantId = targetTenant?.id || defaultTenant?.id;

  if (!tenantId) {
    return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
  }

  for (const msg of value.messages) {
    const from = msg.from; // sender's WhatsApp number
    const waMessageId = msg.id;

    // Find or create conversation scoped to this tenant
    let conversation = await prisma.conversation.findFirst({
      where: { whatsappNumber: from, tenantId }
    });

    if (!conversation) {
      // Try to find a client with this WhatsApp number within the same tenant
      let localFormat = from;
      if (from.startsWith('27') && from.length === 11) {
        localFormat = `0${from.substring(2)}`;
      }
      
      const client = await prisma.client.findFirst({
        where: { 
          tenantId,
          OR: [
            { whatsappNumber: from },
            { whatsappNumber: localFormat },
            { whatsappNumber: `+${from}` }
          ]
        }
      });

      conversation = await prisma.conversation.create({
        data: {
          whatsappNumber: from,
          tenantId,
          clientId: client?.id || null,
          status: 'open',
        }
      });
    }

    if (!conversation) continue;

    let content = '';
    let messageType = 'text';
    let mediaUrl: string | null = null;

    if (msg.type === 'text') {
      content = msg.text?.body || '';
    } else if (msg.type === 'image') {
      messageType = 'image';
      content = msg.image?.caption || 'Image';
      mediaUrl = msg.image?.id;
    } else if (msg.type === 'document') {
      messageType = 'document';
      content = msg.document?.filename || 'Document';
      mediaUrl = msg.document?.id;
    }

    // Store message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        tenantId: conversation.tenantId,
        direction: 'inbound',
        content,
        messageType,
        mediaUrl,
        whatsappMessageId: waMessageId,
        status: 'delivered',
      }
    });

    // Auto-save documents to platform Documents module
    if (messageType === 'document' && mediaUrl && conversation.clientId) {
      try {
        const { getMediaInfo } = await import('@/lib/whatsapp');
        const mediaInfo = await getMediaInfo(
          mediaUrl,
          targetTenant?.whatsappAccessToken || undefined
        ).catch(() => null);
        
        await prisma.document.create({
          data: {
            clientId: conversation.clientId,
            tenantId: conversation.tenantId,
            name: content || 'WhatsApp Document',
            filePath: `/api/whatsapp/media/${mediaUrl}`,
            fileType: mediaInfo?.mime_type || msg.document?.mime_type || 'application/pdf',
            category: 'other',
            version: 1,
            fileSize: BigInt(mediaInfo?.file_size || 0),
          }
        });
      } catch (e) {
        console.error("Failed to auto-save document", e);
      }
    }

    // Update conversation lastMessageAt
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date(), status: 'open' }
    });

    // Mark as read on WhatsApp
    try {
      if (targetTenant?.whatsappPhoneNumberId && targetTenant?.whatsappAccessToken) {
        await markAsRead(waMessageId, {
          phoneNumberId: targetTenant.whatsappPhoneNumberId,
          accessToken: targetTenant.whatsappAccessToken
        });
      } else {
        await markAsRead(waMessageId);
      }
    } catch {
      // Non-critical, continue
    }
  }

  return NextResponse.json({ status: 'ok' });
}
