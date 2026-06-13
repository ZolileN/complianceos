import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { markAsRead } from '@/lib/whatsapp';

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

  for (const msg of value.messages) {
    const from = msg.from; // sender's WhatsApp number
    const waMessageId = msg.id;

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: { whatsappNumber: from }
    });

    if (!conversation) {
      // Try to find a client with this WhatsApp number
      const client = await prisma.client.findFirst({
        where: { whatsappNumber: from }
      });

      let tenantId = client?.tenantId;
      if (!tenantId) {
        const firstTenant = await prisma.tenant.findFirst();
        tenantId = firstTenant?.id;
      }

      if (!tenantId) {
        return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
      }

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

    // Update conversation lastMessageAt
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date(), status: 'open' }
    });

    // Mark as read on WhatsApp
    try {
      await markAsRead(waMessageId);
    } catch {
      // Non-critical, continue
    }
  }

  return NextResponse.json({ status: 'ok' });
}
