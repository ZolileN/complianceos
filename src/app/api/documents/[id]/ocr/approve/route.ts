import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../auth/[...nextauth]/route';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const currentUser = session.user as { tenantId: string; role: string; id: string };
  const tenantId = currentUser.tenantId;

  // Clients cannot approve OCR data
  if (currentUser.role === 'client') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const document = await prisma.document.findFirst({
      where: { id, tenantId },
      include: { client: true }
    });

    if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    if (!document.ocrMetadata) return NextResponse.json({ error: 'No OCR data to approve' }, { status: 400 });

    const metadata = JSON.parse(document.ocrMetadata);
    const updateData: Record<string, string> = {};

    if (metadata.vat_number) {
      updateData.vatNumber = metadata.vat_number;
    }
    if (metadata.registration_number) {
      updateData.registrationNumber = metadata.registration_number;
    }
    if (metadata.tax_number) {
      updateData.taxNumber = metadata.tax_number;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No actionable client fields found in OCR metadata' }, { status: 400 });
    }

    const updatedClient = await prisma.client.update({
      where: { id: document.clientId },
      data: updateData
    });

    return NextResponse.json({ success: true, data: updatedClient });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
