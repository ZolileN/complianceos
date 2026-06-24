import { redis } from '../lib/redis';
import { prisma } from '../lib/prisma';
import { markAsRead } from '../lib/whatsapp';

async function processWebhookQueue() {
  console.log('🚀 Webhook background consumer daemon initialized...');

  while (true) {
    try {
      // BRPOP blocks connection until an item is pushed into the queue
      // 0 means wait indefinitely for an item
      const res = await redis.brpop('whatsapp_webhook_queue', 0);
      
      if (res) {
        const [queueName, payloadString] = res;
        const body = JSON.parse(payloadString);

        if (!body.entry?.[0]?.changes?.[0]?.value) {
          continue;
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
          console.log(`✅ Processed webhook status update sequentially.`);
          continue;
        }

        // Handle incoming messages
        if (!value.messages) {
          continue;
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
          console.log(`⚠️ No tenant found for webhook.`);
          continue;
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
          let mediaUrl = null;

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
              const { getMediaInfo } = await import('../lib/whatsapp');
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

        console.log(`✅ Processed webhook event payload sequentially.`);
      }
    } catch (error) {
      console.error('❌ Error processing queued webhook item:', error);
    }
  }
}

processWebhookQueue();
