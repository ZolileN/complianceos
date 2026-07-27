import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isRbacResponse, requireStaff, requireTenantSession } from '@/lib/rbac';
import {
  fetchReceivedEmailAttachments,
  inboundAddressForTenant,
  mergeAttachmentLists,
  parseStoredAttachments,
} from '@/lib/inbound-email';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await requireTenantSession();
  if (isRbacResponse(user)) return user;
  const forbidden = requireStaff(user);
  if (forbidden) return forbidden;

  const { id } = await context.params;

  try {
    const email = await prisma.inboundEmail.findFirst({
      where: { id, tenantId: user.tenantId! },
      include: {
        client: { select: { id: true, companyName: true } },
        replies: {
          orderBy: { sentAt: 'asc' },
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    if (!email) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (email.status === 'unread') {
      await prisma.inboundEmail.update({
        where: { id },
        data: { status: 'read' },
      });
      email.status = 'read';
    }

    const storedAttachments = parseStoredAttachments(email.attachments);
    const freshAttachments = email.messageId
      ? await fetchReceivedEmailAttachments(email.messageId)
      : [];
    const attachments = mergeAttachmentLists(storedAttachments, freshAttachments).map((item) => ({
      ...item,
      viewUrl: `/api/emails/${email.id}/attachments/${item.id}`,
      downloadUrl: `/api/emails/${email.id}/attachments/${item.id}?download=1`,
      isImage: item.contentType.startsWith('image/'),
    }));

    if (freshAttachments.length > 0 && freshAttachments.length !== storedAttachments.length) {
      await prisma.inboundEmail.update({
        where: { id: email.id },
        data: {
          attachments: JSON.stringify(
            mergeAttachmentLists(storedAttachments, freshAttachments)
          ),
        },
      });
    }

    const inboundAddress = user.tenantSlug
      ? inboundAddressForTenant(user.tenantSlug)
      : null;

    return NextResponse.json({
      data: {
        ...email,
        client: email.client
          ? { id: email.client.id, company_name: email.client.companyName }
          : null,
        replies: email.replies.map((reply) => ({
          id: reply.id,
          bodyText: reply.bodyText,
          sentAt: reply.sentAt,
          user: {
            id: reply.user.id,
            name: reply.user.name,
            email: reply.user.email,
          },
        })),
        attachments,
      },
      inboundAddress,
    });
  } catch (error: unknown) {
    console.error('GET /api/emails/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load email' },
      { status: 500 }
    );
  }
}
