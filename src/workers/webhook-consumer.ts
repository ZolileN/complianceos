/**
 * WhatsApp webhook background consumer
 *
 * Meta Graph API queue processing has been removed. Inbound WhatsApp traffic
 * is handled synchronously by Twilio at POST /api/webhooks/twilio.
 *
 * This process remains available for optional async jobs (e.g. status callbacks
 * queued onto Redis). It drains any leftover Meta payloads as no-ops so the
 * historical `whatsapp_webhook_queue` key can clear safely.
 */

import { redis, pushTenantLog } from '../lib/redis';
import { prisma } from '../lib/prisma';

async function processWebhookQueue() {
  console.log('🚀 Twilio WhatsApp worker online (sync ingest lives at /api/webhooks/twilio)...');

  while (true) {
    try {
      const res = await redis.brpop('whatsapp_webhook_queue', 0);
      if (!res) continue;

      const [, payloadString] = res;
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(payloadString);
      } catch {
        console.warn('⚠️ Dropping non-JSON webhook queue item');
        continue;
      }

      // Legacy Meta Graph payloads — discard
      if (body.entry || body.object === 'whatsapp_business_account') {
        console.warn('⚠️ Dropping deprecated Meta WhatsApp payload from queue');
        continue;
      }

      // Optional Twilio MessageSid status updates queued by other jobs
      const messageSid = typeof body.MessageSid === 'string' ? body.MessageSid : null;
      const messageStatus = typeof body.MessageStatus === 'string' ? body.MessageStatus : null;

      if (messageSid && messageStatus) {
        const affectedMsg = await prisma.message.findFirst({
          where: { whatsappMessageId: messageSid },
          select: { tenantId: true },
        });

        await prisma.message.updateMany({
          where: { whatsappMessageId: messageSid },
          data: { status: messageStatus },
        });

        if (affectedMsg?.tenantId) {
          await pushTenantLog(
            affectedMsg.tenantId,
            `WhatsApp message status updated to "${messageStatus}"`,
            'webhook',
            { messageId: messageSid, status: messageStatus }
          );
        }

        console.log(`✅ Processed Twilio status update for ${messageSid}`);
        continue;
      }

      console.warn('⚠️ Unrecognised webhook queue payload shape — dropped');
    } catch (error) {
      console.error('❌ Error processing queued webhook item:', error);
    }
  }
}

processWebhookQueue();
