import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { sendTextMessage } from '@/lib/whatsapp';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = (session.user as { tenantId: string }).tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const { to, message, conversation_id } = await request.json();
  if (!to || !message) {
    return NextResponse.json({ error: 'Missing "to" or "message"' }, { status: 400 });
  }

  try {
    const result = await sendTextMessage(to, message);
    const waMessageId = result.messages?.[0]?.id;

    if (conversation_id) {
      await prisma.message.create({
        data: {
          conversationId: conversation_id,
          tenantId,
          direction: 'outbound',
          content: message,
          messageType: 'text',
          whatsappMessageId: waMessageId || null,
          status: 'sent',
        }
      });

      await prisma.conversation.update({
        where: { id: conversation_id },
        data: { lastMessageAt: new Date() }
      });
    }

    return NextResponse.json({ success: true, message_id: waMessageId });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
