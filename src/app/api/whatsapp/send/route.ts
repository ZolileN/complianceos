import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { sendWhatsAppMessage } from '@/lib/twilio';
import { emitSkillEvent } from '@/lib/skill-triggers';
import {
  assertWhatsappEnabled,
  incrementUsage,
  PlanLimitError,
  ReadOnlyError,
  planLimitResponse,
  readOnlyResponse,
} from '@/lib/entitlements';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as { tenantId: string; id: string; role: string };
  const tenantId = user.tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const { to, message, conversation_id } = await request.json();
  if (!to || !message) {
    return NextResponse.json({ error: 'Missing "to" or "message"' }, { status: 400 });
  }

  try {
    try {
      await assertWhatsappEnabled(tenantId);
    } catch (err) {
      if (err instanceof PlanLimitError) return planLimitResponse(err);
      if (err instanceof ReadOnlyError) return readOnlyResponse(err);
      throw err;
    }

    const result = await sendWhatsAppMessage(to, message);
    const waMessageId = result.sid;

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
        },
      });

      await prisma.conversation.update({
        where: { id: conversation_id },
        data: { lastMessageAt: new Date() },
      });
    }

    await incrementUsage(tenantId, 'whatsapp_messages', 1).catch(() => undefined);

    if (tenantId && user.id) {
      emitSkillEvent(tenantId, 'message.sent', user.id, user.role || 'client', {
        to,
        conversationId: conversation_id || null,
        messageId: waMessageId,
      }).catch((err) => console.error('Skill event emission failed:', err));
    }

    return NextResponse.json({ success: true, message_id: waMessageId });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
    console.error('Twilio send error:', err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
