import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isRbacResponse, requireStaff, requireTenantSession } from '@/lib/rbac';
import { inboundAddressForTenant } from '@/lib/inbound-email';

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
