import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

  // Validate webhook structure
  if (!body.entry?.[0]?.changes?.[0]?.value) {
    return NextResponse.json({ status: 'ok' });
  }

  const value = body.entry[0].changes[0].value;

  // Handle message status updates
  if (value.statuses) {
    const supabase = await createClient();
    for (const status of value.statuses) {
      await supabase.from('messages')
        .update({ status: status.status })
        .eq('whatsapp_message_id', status.id);
    }
    return NextResponse.json({ status: 'ok' });
  }

  // Handle incoming messages
  if (!value.messages) {
    return NextResponse.json({ status: 'ok' });
  }

  const supabase = await createClient();

  for (const msg of value.messages) {
    const from = msg.from; // sender's WhatsApp number
    const waMessageId = msg.id;

    // Find or create conversation
    // First try to find by whatsapp_number
    let { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('whatsapp_number', from)
      .single();

    if (!conversation) {
      // Try to find a client with this WhatsApp number to link
      const { data: client } = await supabase
        .from('clients')
        .select('id, tenant_id')
        .eq('whatsapp_number', from)
        .single();

      // We need a tenant_id — use the client's or fall back to the first tenant
      let tenantId = client?.tenant_id;
      if (!tenantId) {
        const { data: firstTenant } = await supabase
          .from('tenants')
          .select('id')
          .limit(1)
          .single();
        tenantId = firstTenant?.id;
      }

      if (!tenantId) {
        return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
      }

      const { data: newConvo } = await supabase
        .from('conversations')
        .insert({
          whatsapp_number: from,
          tenant_id: tenantId,
          client_id: client?.id || null,
          status: 'open',
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      conversation = newConvo;
    }

    if (!conversation) continue;

    // Extract message content
    let content = '';
    let messageType = 'text';
    let mediaUrl: string | null = null;

    if (msg.type === 'text') {
      content = msg.text?.body || '';
    } else if (msg.type === 'image') {
      messageType = 'image';
      content = msg.image?.caption || 'Image';
      mediaUrl = msg.image?.id; // Media ID, to be downloaded
    } else if (msg.type === 'document') {
      messageType = 'document';
      content = msg.document?.filename || 'Document';
      mediaUrl = msg.document?.id;
    } else if (msg.type === 'audio') {
      messageType = 'audio';
      content = 'Audio message';
      mediaUrl = msg.audio?.id;
    } else if (msg.type === 'video') {
      messageType = 'video';
      content = 'Video';
      mediaUrl = msg.video?.id;
    }

    // Store message
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      tenant_id: conversation.tenant_id,
      direction: 'inbound',
      content,
      message_type: messageType,
      media_url: mediaUrl,
      whatsapp_message_id: waMessageId,
      status: 'delivered',
    });

    // Update conversation last_message_at
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString(), status: 'open' })
      .eq('id', conversation.id);

    // Mark as read on WhatsApp
    try {
      await markAsRead(waMessageId);
    } catch {
      // Non-critical, continue
    }
  }

  return NextResponse.json({ status: 'ok' });
}
