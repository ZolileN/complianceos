import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = (session.user as { tenantId: string }).tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  try {
    const data = await prisma.document.findMany({
      where: {
        tenantId,
        ...(category ? { category } : {})
      },
      include: {
        client: { select: { id: true, companyName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const count = await prisma.document.count({
      where: {
        tenantId,
        ...(category ? { category } : {})
      }
    });

    const mappedData = data.map(doc => {
      const { fileSize, ...rest } = doc;
      return {
        ...rest,
        file_size: Number(fileSize), // Convert BigInt to Number for JSON
        created_at: rest.createdAt,
        client: rest.client ? { id: rest.client.id, company_name: rest.client.companyName } : null,
      };
    });

    return NextResponse.json({ data: mappedData, count });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
