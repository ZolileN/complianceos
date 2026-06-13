/* ============================================================
   ComplianceOS — WhatsApp Meta Business API Utilities
   ============================================================ */

const GRAPH_API_URL = 'https://graph.facebook.com/v25.0';

interface WhatsAppTextMessage {
  messaging_product: 'whatsapp';
  to: string;
  type: 'text';
  text: { body: string };
}

interface WhatsAppTemplateMessage {
  messaging_product: 'whatsapp';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: { code: string };
    components?: Array<{
      type: string;
      parameters: Array<{ type: string; text?: string }>;
    }>;
  };
}

interface SendMessageResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

interface MediaResponse {
  url: string;
  mime_type: string;
  sha256: string;
  file_size: number;
  id: string;
}

/**
 * Send a text message via WhatsApp Cloud API
 */
export async function sendTextMessage(
  to: string,
  body: string
): Promise<SendMessageResponse> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  const payload: WhatsAppTextMessage = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body },
  };

  const response = await fetch(
    `${GRAPH_API_URL}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Meta API Validation Failure:", JSON.stringify(errorData, null, 2));
    throw new Error(`WhatsApp API Error: ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

/**
 * Send a template message via WhatsApp Cloud API
 */
export async function sendTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string = 'en',
  parameters?: Array<{ type: string; text?: string }>
): Promise<SendMessageResponse> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  const payload: WhatsAppTemplateMessage = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(parameters && {
        components: [
          {
            type: 'body',
            parameters,
          },
        ],
      }),
    },
  };

  const response = await fetch(
    `${GRAPH_API_URL}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Meta API Validation Failure:", JSON.stringify(errorData, null, 2));
    throw new Error(`WhatsApp API Error: ${JSON.stringify(errorData)}`);
  }

  return response.json();
}

/**
 * Download media from WhatsApp (e.g., images, documents sent by clients)
 */
export async function downloadMedia(mediaId: string): Promise<Buffer> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  // First, get the media URL
  const metaResponse = await fetch(
    `${GRAPH_API_URL}/${mediaId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!metaResponse.ok) {
    throw new Error('Failed to get media URL');
  }

  const mediaInfo: MediaResponse = await metaResponse.json();

  // Then download the actual media
  const mediaResponse = await fetch(mediaInfo.url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!mediaResponse.ok) {
    throw new Error('Failed to download media');
  }

  const arrayBuffer = await mediaResponse.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Mark a message as read
 */
export async function markAsRead(messageId: string): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  await fetch(`${GRAPH_API_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }),
  });
}

/**
 * Get media metadata
 */
export async function getMediaInfo(mediaId: string): Promise<MediaResponse> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  const response = await fetch(`${GRAPH_API_URL}/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to get media info');
  }

  return response.json();
}
