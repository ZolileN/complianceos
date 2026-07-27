import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emitSkillEvent } from '@/lib/skill-triggers';

type ResendInboundPayload = {
  type?: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string[];
    subject?: string;
    text?: string;
    html?: string;
    headers?: Record<string, string>;
    attachments?: Array<{ filename?: string; content_type?: string; download_url?: string }>;
  };
};

function parseTenantSlug(toAddresses: string[]): string | null {
  const domain = process.env.INBOUND_EMAIL_DOMAIN?.trim().toLowerCase();
  if (!domain) return null;
  for (const addr of toAddresses) {
    const lower = addr.toLowerCase();
    const at = lower.indexOf('@');
    if (at === -1) continue;
    const local = lower.slice(0, at);
    const host = lower.slice(at + 1);
    if (host === domain || host.endsWith(`.${domain}`)) {
      return local;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (webhookSecret) {
    const sig = request.headers.get('svix-signature') || request.headers.get('resend-signature');
    if (!sig) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }
  }

  let payload: ResendInboundPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (payload.type !== 'email.received' || !payload.data) {
    return NextResponse.json({ received: true, skipped: true });
  }

  const data = payload.data;
  const toList = data.to || [];
  const slug = parseTenantSlug(toList);
  if (!slug) {
    return NextResponse.json({ error: 'Unknown recipient' }, { status: 422 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  const fromAddress = data.from || 'unknown';
  const matchedClient = await prisma.client.findFirst({
    where: {
      tenantId: tenant.id,
      email: { equals: fromAddress, mode: 'insensitive' },
    },
    select: { id: true },
  });

  const messageId = data.email_id || null;
  if (messageId) {
    const dup = await prisma.inboundEmail.findUnique({ where: { messageId } });
    if (dup) return NextResponse.json({ received: true, duplicate: true });
  }

  const email = await prisma.inboundEmail.create({
    data: {
      tenantId: tenant.id,
      clientId: matchedClient?.id || null,
      fromAddress,
      toAddress: toList[0] || '',
      subject: data.subject || null,
      bodyText: data.text || null,
      bodyHtml: data.html || null,
      messageId,
      headers: data.headers ? JSON.stringify(data.headers) : null,
      attachments: JSON.stringify(
        (data.attachments || []).map((a) => ({
          name: a.filename,
          contentType: a.content_type,
          url: a.download_url,
        }))
      ),
    },
  });

  await emitSkillEvent(tenant.id, 'message.received', 'system', 'system', {
    channel: 'email',
    inboundEmailId: email.id,
    from: fromAddress,
    subject: data.subject,
    clientId: matchedClient?.id,
  });

  return NextResponse.json({ received: true, id: email.id });
}
