import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { markAsRead } from '@/lib/whatsapp';
import { AdminLogger } from '@/lib/admin-logs';
import { redis } from '@/lib/redis';
import { emitSkillEvent } from '@/lib/skill-triggers';

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
  try {
    const payload = await request.json();

    // 2. Perform a rapid structure check (No heavy processing or DB calls here)
    if (!payload.object) {
      return NextResponse.json({ error: 'Invalid payload structured shape' }, { status: 400 });
    }

    // 3. Push the raw payload into your Redis queue asynchronously (Takes < 2ms)
    // Your background OCR / Message Worker Daemon will pull from this queue sequentially
    await redis.lpush('whatsapp_webhook_queue', JSON.stringify(payload));

    // Try to trigger skills if this is a message
    try {
      const phoneNumberId = payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
      const messages = payload.entry?.[0]?.changes?.[0]?.value?.messages;
      const contacts = payload.entry?.[0]?.changes?.[0]?.value?.contacts;

      if (phoneNumberId && messages && messages.length > 0) {
        const tenant = await prisma.tenant.findFirst({
          where: { whatsappPhoneNumberId: phoneNumberId },
        });

        if (tenant) {
          // Fire and forget skill event
          emitSkillEvent(tenant.id, 'message.received', 'system', 'system', {
            message: messages[0],
            contact: contacts?.[0]
          }).catch(console.error);
        }
      }
    } catch (e) {
      console.error('Skill event emission failed:', e);
    }

    // 4. IMMEDIATELY hand a 200 OK back to Meta. The connection cuts cleanly.
    return new NextResponse('EVENT_RECEIVED', { status: 200 });

  } catch (err) {
    console.error('Webhook ingestion crash:', err);
    return new NextResponse('Internal Ingestion Error', { status: 500 });
  }
}
