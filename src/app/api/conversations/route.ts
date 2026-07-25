import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
  isConsultant,
  isRbacResponse,
  requireStaff,
  requireTenantSession,
} from '@/lib/rbac';

const ALLOWED_STATUSES = ['open', 'closed', 'pending', 'archived'];

export async function GET(request: NextRequest) {
  const user = await requireTenantSession();
  if (isRbacResponse(user)) return user;
  const forbidden = requireStaff(user);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const mine = searchParams.get('mine') === '1';

  if (status && !ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const where: Prisma.ConversationWhereInput = {
    tenantId: user.tenantId!,
    ...(status ? { status } : {}),
  };

  if (mine) {
    where.assignedTo = user.id;
  } else if (isConsultant(user)) {
    where.OR = [{ assignedTo: user.id }, { assignedTo: null }];
  }

  try {
    const data = await prisma.conversation.findMany({
      where,
      include: {
        client: { select: { id: true, companyName: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    const mappedData = data.map((convo) => ({
      ...convo,
      whatsapp_number: convo.whatsappNumber,
      last_message_at: convo.lastMessageAt,
      client: convo.client
        ? { id: convo.client.id, company_name: convo.client.companyName }
        : null,
    }));

    return NextResponse.json({ data: mappedData });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
