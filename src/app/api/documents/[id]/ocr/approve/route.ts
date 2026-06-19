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
    
    // Cast to unknown and then to custom type to bypass stale IDE cache
    const docWithOcr = document as unknown as { ocrMetadata: string | null; clientId: string };
    if (!docWithOcr.ocrMetadata) return NextResponse.json({ error: 'No OCR data to approve' }, { status: 400 });

    const metadata = JSON.parse(docWithOcr.ocrMetadata);
    const updateData: Record<string, unknown> = {};

    // Core identifier fields — always sync when present
    if (metadata.vat_number)           updateData.vatNumber           = metadata.vat_number;
    if (metadata.registration_number)  updateData.registrationNumber  = metadata.registration_number;
    if (metadata.tax_number)           updateData.taxNumber           = metadata.tax_number;

    // COR14.3 specific: company name (only override if it looks meaningful)
    if (metadata.company_name && metadata.company_name !== 'PraxisOne Client') {
      updateData.companyName = metadata.company_name;
    }

    // Address extraction: handle both 'registered_address' from COR and 'address' from bank statements
    const extractedAddress = metadata.registered_address || metadata.address;
    if (extractedAddress) {
      updateData.address = extractedAddress;
    }

    // Directors: store as JSON string of objects on the client record
    if (metadata.directors) {
      const directorObjects = metadata.directors.split('; ').map((dirStr: string) => {
        // e.g., "NONZAPA, ZOLILE JACKSON (ID: 8404145741084, Appointed: 27/03/2023)"
        const nameMatch = dirStr.match(/^([^(]+)/);
        const idMatch = dirStr.match(/ID:\s*([^,)]+)/);
        return {
          name: nameMatch ? nameMatch[1].trim() : dirStr,
          id_number: idMatch ? idMatch[1].trim() : '',
          email: '',
          phone: ''
        };
      });
      updateData.directors = JSON.stringify(directorObjects);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No actionable client fields found in OCR metadata' }, { status: 400 });
    }

    const updatedClient = await prisma.client.update({
      where: { id: document.clientId },
      data: updateData
    });

    // --- AUTOMATED COMPLIANCE ALERTS ---
    const now = new Date();
    
    if (document.category === 'bee_certificate' && metadata.expiry_date) {
      const isExpired = new Date(metadata.expiry_date) < now;
      const status = isExpired ? 'action_required' : 'compliant';
      
      await prisma.complianceItem.upsert({
        where: {
          clientId_category_name: {
            clientId: document.clientId,
            category: 'BEE',
            name: 'B-BBEE Certificate'
          }
        },
        update: {
          status,
          dueDate: new Date(metadata.expiry_date),
          lastChecked: now,
        },
        create: {
          clientId: document.clientId,
          tenantId: tenantId,
          category: 'BEE',
          name: 'B-BBEE Certificate',
          status,
          dueDate: new Date(metadata.expiry_date),
          lastChecked: now,
        }
      });
    } else if ((document.category === 'tax_certificate' || document.category === 'tax_clearance') && metadata.expiry_date) {
      const isExpired = new Date(metadata.expiry_date) < now;
      const status = isExpired ? 'action_required' : 'compliant';

      await prisma.complianceItem.upsert({
        where: {
          clientId_category_name: {
            clientId: document.clientId,
            category: 'SARS',
            name: 'Tax Clearance'
          }
        },
        update: {
          status,
          dueDate: new Date(metadata.expiry_date),
          lastChecked: now,
        },
        create: {
          clientId: document.clientId,
          tenantId: tenantId,
          category: 'SARS',
          name: 'Tax Clearance',
          status,
          dueDate: new Date(metadata.expiry_date),
          lastChecked: now,
        }
      });
    } else if (document.category === 'cor_document' && metadata.registration_date) {
      // Annual Returns are due within 30 days after the anniversary of the registration date
      const regParts = metadata.registration_date.split('/');
      // Handle both DD/MM/YYYY and YYYY-MM-DD
      let regDateStr = metadata.registration_date;
      if (regParts.length === 3 && regParts[0].length === 2) {
        regDateStr = `${regParts[2]}-${regParts[1]}-${regParts[0]}`;
      }
      const regDate = new Date(regDateStr);
      
      if (!isNaN(regDate.getTime())) {
        const currentYear = now.getFullYear();
        let nextAnniversary = new Date(currentYear, regDate.getMonth(), regDate.getDate());
        
        // If the anniversary has passed by more than 30 days, the NEXT due date is next year
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        if (now.getTime() - nextAnniversary.getTime() > thirtyDaysInMs) {
          nextAnniversary = new Date(currentYear + 1, regDate.getMonth(), regDate.getDate());
        }
        
        const nextDueDate = new Date(nextAnniversary.getTime() + thirtyDaysInMs);
        
        // Check if we are currently inside the 30-day filing window
        const isInsideWindow = now >= nextAnniversary && now <= nextDueDate;
        const status = isInsideWindow ? 'action_required' : 'compliant';

        await prisma.complianceItem.upsert({
          where: {
            clientId_category_name: {
              clientId: document.clientId,
              category: 'CIPC',
              name: 'Annual Returns'
            }
          },
          update: {
            status,
            dueDate: nextDueDate,
            lastChecked: now,
          },
          create: {
            clientId: document.clientId,
            tenantId: tenantId,
            category: 'CIPC',
            name: 'Annual Returns',
            status,
            dueDate: nextDueDate,
            lastChecked: now,
          }
        });
      }
    }

    return NextResponse.json({ success: true, data: updatedClient });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
