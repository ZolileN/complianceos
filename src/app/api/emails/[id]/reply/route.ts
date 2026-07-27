import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isRbacResponse, requireStaff, requireTenantSession } from '@/lib/rbac';
import { inboundAddressForTenant } from '@/lib/inbound-email';
import { sendInboxReply } from '@/lib/inbound-email-reply';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await requireTenantSession();
  if (isRbacResponse(user)) return user;
  const forbidden = requireStaff(user);
  if (forbidden) return forbidden;

  const { id } = await context.params;

  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  if (!user.tenantSlug) {
    return NextResponse.json({ error: 'Tenant slug missing' }, { status: 400 });
  }

  try {
    const email = await prisma.inboundEmail.findFirst({
      where: { id, tenantId: user.tenantId! },
      include: { tenant: { select: { name: true } } },
    });

    if (!email) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const replyToAddress = inboundAddressForTenant(user.tenantSlug);
    if (replyToAddress.includes('your-inbound-domain')) {
      return NextResponse.json(
        { error: 'Inbound email domain is not configured' },
        { status: 503 }
      );
    }

    const sendResult = await sendInboxReply({
      to: email.fromAddress,
      subject: email.subject,
      body: message,
      firmName: email.tenant.name,
      replyToAddress,
      inReplyToMessageId: email.messageId,
    });

    if (!sendResult.success) {
      return NextResponse.json({ error: sendResult.error }, { status: 502 });
    }

    const reply = await prisma.inboundEmailReply.create({
      data: {
        inboundEmailId: email.id,
        tenantId: user.tenantId!,
        userId: user.id,
        bodyText: message,
        resendId: sendResult.resendId,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    await prisma.inboundEmail.update({
      where: { id: email.id },
      data: { status: 'read' },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: reply.id,
        bodyText: reply.bodyText,
        sentAt: reply.sentAt,
        user: {
          id: reply.user.id,
          name: reply.user.name,
          email: reply.user.email,
        },
      },
    });
  } catch (error: unknown) {
    console.error('POST /api/emails/[id]/reply error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send reply' },
      { status: 500 }
    );
  }
}
