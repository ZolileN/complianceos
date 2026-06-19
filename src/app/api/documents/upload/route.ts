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
        fileSize: size ? BigInt(Math.round(Number(size))) : BigInt(0),
        uploadedById: userId,
      }
    });

    const mappedDocument = {
      ...document,
      fileSize: Number(document.fileSize)
    };

    // --- COMPLIANCE AUTOMATION (fire-and-forget — does NOT block response) ---
    const mapping: Record<string, { cat: string; name: string }> = {
      'vat_certificate': { cat: 'SARS', name: 'VAT' },
      'bee_certificate': { cat: 'BEE', name: 'Certificate Expiry' },
      'tax_certificate': { cat: 'SARS', name: 'Income Tax' },
      'cor_document':    { cat: 'CIPC', name: 'Annual Returns' }
    };

    if (category && mapping[category]) {
      const match = mapping[category];
      // No await — runs in background after response is sent
      prisma.complianceItem.findFirst({
        where: {
          tenantId,
          clientId: client_id,
          category: match.cat,
          name: match.name,
          status: { in: ['action_required', 'critical'] }
        }
      }).then(itemToUpdate => {
        if (!itemToUpdate) return;
        return prisma.complianceItem.update({
          where: { id: itemToUpdate.id },
          data: {
            status: 'compliant',
            lastChecked: new Date(),
            notes: (itemToUpdate.notes ? itemToUpdate.notes + '\n\n' : '') +
              `Status automatically updated via document upload: ${document.name}`
          }
        });
      }).catch(err => console.error('Compliance auto-update failed (non-critical):', err));
    }
    // --- END COMPLIANCE AUTOMATION ---

    return NextResponse.json({ data: mappedDocument }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Database Save Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

