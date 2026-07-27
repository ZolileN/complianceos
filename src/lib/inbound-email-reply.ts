import { getResend } from '@/lib/resend-client';

function outboundFromAddress(firmName: string): string {
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!from) {
    throw new Error('RESEND_FROM_EMAIL is not configured');
  }
  if (from.includes('<')) return from;
  return `${firmName} <${from}>`;
}

function replySubject(subject: string | null | undefined): string {
  const base = (subject || '(no subject)').trim();
  return /^re:/i.test(base) ? base : `Re: ${base}`;
}

function formatMessageId(messageId: string | null | undefined): string | undefined {
  if (!messageId) return undefined;
  const trimmed = messageId.trim();
  if (!trimmed) return undefined;
  return trimmed.startsWith('<') ? trimmed : `<${trimmed}>`;
}

export async function sendInboxReply(opts: {
  to: string;
  subject: string | null;
  body: string;
  firmName: string;
  replyToAddress: string;
  inReplyToMessageId?: string | null;
}) {
  const resend = getResend();
  if (!resend) {
    return { success: false as const, error: 'RESEND_API_KEY is not configured' };
  }

  const inReplyTo = formatMessageId(opts.inReplyToMessageId);
  const headers: Record<string, string> = {};
  if (inReplyTo) {
    headers['In-Reply-To'] = inReplyTo;
    headers.References = inReplyTo;
  }

  try {
    const result = await resend.emails.send({
      from: outboundFromAddress(opts.firmName),
      to: opts.to,
      replyTo: opts.replyToAddress,
      subject: replySubject(opts.subject),
      text: opts.body,
      headers: Object.keys(headers).length ? headers : undefined,
    });

    const resendId =
      result.data && 'id' in result.data ? (result.data.id as string) : null;

    return { success: true as const, resendId };
  } catch (error) {
    console.error('Failed to send inbox reply:', error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Failed to send reply',
    };
  }
}

export { replySubject, formatMessageId };
