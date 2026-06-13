import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  interface SessionUser {
    id?: string;
    tenantId?: string;
  }
  const user = session.user as SessionUser;
  const tenantId = user.tenantId;
  const userId = user.id;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const body = await request.json();
  const { url, name, size, type, client_id, category } = body;

  if (!url || !client_id) {
    return NextResponse.json({ error: 'Missing url or client_id' }, { status: 400 });
  }

  try {
    const document = await prisma.document.create({
      data: {
        tenantId,
        clientId: client_id,
        name: name || 'Uploaded Document',
        filePath: url,
        fileType: type || 'application/octet-stream',
        category: category || 'other',
        fileSize: size ? BigInt(size) : BigInt(0),
        uploadedById: userId,
      }
    });

    const mappedDocument = {
      ...document,
      fileSize: Number(document.fileSize)
    };

    return NextResponse.json({ data: mappedDocument }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Database Save Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
