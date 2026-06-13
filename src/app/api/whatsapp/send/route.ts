import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendTextMessage } from '@/lib/whatsapp';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('tenant_id').eq('id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const { to, message, conversation_id } = await request.json();
  if (!to || !message) {
    return NextResponse.json({ error: 'Missing "to" or "message"' }, { status: 400 });
  }

  try {
    // Send via WhatsApp Cloud API
    const result = await sendTextMessage(to, message);
    const waMessageId = result.messages?.[0]?.id;

    // Store outbound message
    if (conversation_id) {
      await supabase.from('messages').insert({
        conversation_id,
        tenant_id: profile.tenant_id,
        direction: 'outbound',
        content: message,
        message_type: 'text',
        whatsapp_message_id: waMessageId || null,
        status: 'sent',
      });

      // Update conversation
      await supabase.from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversation_id);
    }

    return NextResponse.json({ success: true, message_id: waMessageId });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
