import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = (session.user as { tenantId: string }).tenantId;

  const body = await request.json();
  try {
    const data: Record<string, unknown> = {};
    if (body.name) data.name = body.name;
    if (body.category) data.category = body.category;
    
    const document = await prisma.document.update({
      where: { id, tenantId },
      data
    });
    
    const mappedDoc = { ...document, fileSize: Number(document.fileSize) };
    return NextResponse.json({ data: mappedDoc });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tenantId = (session.user as { tenantId: string }).tenantId;

  try {
    await prisma.document.delete({
      where: { id, tenantId }
    });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
