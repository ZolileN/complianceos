import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = (session.user as { tenantId: string }).tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  try {
    const data = await prisma.conversation.findMany({
      where: { tenantId },
      include: {
        client: { select: { id: true, companyName: true } }
      },
      orderBy: { lastMessageAt: 'desc' }
    });

    const mappedData = data.map(convo => ({
      ...convo,
      whatsapp_number: convo.whatsappNumber,
      last_message_at: convo.lastMessageAt,
      client: convo.client ? { id: convo.client.id, company_name: convo.client.companyName } : null,
    }));

    return NextResponse.json({ data: mappedData });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
