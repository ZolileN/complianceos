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
  const clientId = searchParams.get('client_id');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = (page - 1) * limit;

  const hasClientId = clientId && clientId !== 'null' && clientId !== 'undefined';

  const where = {
    tenantId,
    ...(category ? { category } : {}),
    ...(hasClientId ? { clientId } : {}),
  };

  try {
    const data = await prisma.document.findMany({
      where,
      include: {
        client: { select: { id: true, companyName: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    const count = await prisma.document.count({ where });

    const mappedData = data.map(doc => {
      const { fileSize, ...rest } = doc;
      return {
        ...rest,
        file_size: Number(fileSize), // Convert BigInt to Number for JSON
        created_at: rest.createdAt,
        file_path: doc.filePath,
        file_type: doc.fileType,
        client: rest.client ? { id: rest.client.id, company_name: rest.client.companyName } : null,
      };
    });

    return NextResponse.json({ data: mappedData, count });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
