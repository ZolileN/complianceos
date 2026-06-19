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
    // Check if duplicate document exists
    const existingDoc = await prisma.document.findFirst({
      where: {
        tenantId,
        clientId: client_id,
        name: name || 'Uploaded Document',
        category: category || 'other'
      }
    });

    let document;
    if (existingDoc) {
      // 1. Create a historical version of the existing document
      await prisma.documentVersion.create({
        data: {
          documentId: existingDoc.id,
          version: existingDoc.version,
          filePath: existingDoc.filePath,
          fileType: existingDoc.fileType,
          fileSize: existingDoc.fileSize,
          uploadedById: existingDoc.uploadedById,
          createdAt: existingDoc.updatedAt
        }
      });

      // 2. Update the main document with new file details and increment version
      document = await prisma.document.update({
        where: { id: existingDoc.id },
        data: {
          filePath: url,
          fileType: type || 'application/octet-stream',
          fileSize: size ? BigInt(Math.round(Number(size))) : BigInt(0),
          version: existingDoc.version + 1,
          uploadedById: userId,
          ocrStatus: 'pending',
          ocrText: null,
          ocrMetadata: null
        }
      });
    } else {
      // Create new document
      document = await prisma.document.create({
        data: {
          tenantId,
          clientId: client_id,
          name: name || 'Uploaded Document',
          filePath: url,
          fileType: type || 'application/octet-stream',
          category: category || 'other',
          version: 1,
          fileSize: size ? BigInt(Math.round(Number(size))) : BigInt(0),
          uploadedById: userId,
          ocrStatus: 'pending',
        }
      });
    }

    const mappedDocument = {
      ...document,
      fileSize: Number(document.fileSize)
    };

    // --- OCR BACKGROUND WORKER ---
    triggerOcrSimulation(document.id).catch(err => {
      console.error("OCR background processing error:", err);
    });

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

// Simulated background OCR extraction logic
async function triggerOcrSimulation(documentId: string) {
  try {
    // 1. Set status to processing
    await prisma.document.update({
      where: { id: documentId },
      data: { ocrStatus: 'processing' }
    });

    // 2. Wait for 3 seconds to simulate scanning
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 3. Fetch the document details to extract OCR based on name and category
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      include: { client: true }
    });

    if (!doc) return;

    const clientName = doc.client?.companyName || 'PraxisOne Client';
    const docName = doc.name;
    const cleanCategory = doc.category;

    // 4. Generate high-quality realistic OCR text and JSON metadata based on category
    let ocrText = '';
    let metadata: Record<string, string> = {};

    if (cleanCategory === 'vat_certificate') {
      const vatNum = "4" + Math.floor(100000000 + Math.random() * 900000000).toString(); // 10 digit VAT starting with 4
      metadata = {
        document_type: 'VAT 103 Certificate of Registration',
        company_name: clientName,
        vat_number: vatNum,
        registration_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year ago
        status: 'Active'
      };
      ocrText = `SOUTH AFRICAN REVENUE SERVICE\n\n` +
                `CERTIFICATE OF REGISTRATION: VALUE ADDED TAX\n` +
                `Issued under the provisions of the Value-Added Tax Act, 1991 (Act No. 89 of 1991)\n\n` +
                `Trading Name: ${clientName.toUpperCase()}\n` +
                `Registration Number: ${doc.client?.registrationNumber || '2023/892749/07'}\n` +
                `VAT Registration Number: ${vatNum}\n` +
                `Effective Date: ${metadata.registration_date}\n\n` +
                `This is to certify that the vendor above has been registered as a Value-Added Tax vendor.\n` +
                `Please ensure all tax invoices issued show the above VAT Registration Number.`;
    } else if (cleanCategory === 'bee_certificate') {
      const certNum = "BEE-" + Math.floor(100000 + Math.random() * 900000).toString() + "-26";
      const beeLevel = ["Level 1 Contributor", "Level 2 Contributor", "Level 4 Contributor"][Math.floor(Math.random() * 3)];
      const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 1 year from now
      metadata = {
        document_type: 'Broad-Based Black Economic Empowerment Certificate',
        company_name: clientName,
        certificate_number: certNum,
        bee_level: beeLevel,
        procurement_recognition: beeLevel.includes('Level 1') ? '135%' : beeLevel.includes('Level 2') ? '125%' : '100%',
        issue_date: new Date().toISOString().split('T')[0],
        expiry_date: expiryDate
      };
      ocrText = `EMPOWERING BROAD-BASED BLACK ECONOMIC EMPOWERMENT CERTIFICATE\n` +
                `VERIFICATION STANDARD: AMENDED CODES OF GOOD PRACTICE\n\n` +
                `Measured Entity: ${clientName}\n` +
                `Registration Number: ${doc.client?.registrationNumber || '2023/892749/07'}\n` +
                `VAT Number: ${doc.client?.vatNumber || '4910283746'}\n\n` +
                `B-BBEE Status Level: ${beeLevel}\n` +
                `Procurement Recognition Level: ${metadata.procurement_recognition}\n` +
                `Certificate Number: ${certNum}\n` +
                `Date of Issue: ${metadata.issue_date}\n` +
                `Date of Expiry: ${metadata.expiry_date}\n\n` +
                `Technical Signatory: S. Naidoo\n` +
                `Verification Agency: BEE-Rating South Africa Ltd.`;
    } else if (cleanCategory === 'tax_certificate') {
      const taxNum = "9" + Math.floor(100000000 + Math.random() * 900000000).toString();
      const pin = Math.floor(10000000 + Math.random() * 90000000).toString(16).toUpperCase();
      const expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 1 year from now
      metadata = {
        document_type: 'Tax Clearance Certificate (Pin)',
        company_name: clientName,
        tax_number: taxNum,
        security_pin: pin,
        status: 'Compliant',
        expiry_date: expiryDate
      };
      ocrText = `SARS tax compliance status\n\n` +
                `Tax Compliant Status Pin Issued\n\n` +
                `Entity Details:\n` +
                `Registered Name: ${clientName}\n` +
                `Tax Reference Number: ${taxNum}\n` +
                `PIN: ${pin}\n` +
                `Expiry Date: ${metadata.expiry_date}\n\n` +
                `The status of the taxpayer has been checked and found to be compliant on the date below.\n` +
                `Date of Enquiry: ${new Date().toLocaleDateString()}`;
    } else if (cleanCategory === 'cor_document') {
      const regNum = "K" + new Date().getFullYear().toString() + "/" + Math.floor(100000 + Math.random() * 900000).toString() + "/07";
      metadata = {
        document_type: 'CIPC COR14.3 Registration Certificate',
        company_name: clientName,
        registration_number: regNum,
        registration_date: new Date().toISOString().split('T')[0],
        enterprise_type: 'Private Company'
      };
      ocrText = `COMMISSIONER FOR INTELLECTUAL PROPERTY AND COMPANIES (CIPC)\n` +
                `REPUBLIC OF SOUTH AFRICA\n\n` +
                `REGISTRATION CERTIFICATE COR14.3\n` +
                `This is to certify that the enterprise below has been registered under the Companies Act, 2008.\n\n` +
                `Enterprise Name: ${clientName.toUpperCase()} (PTY) LTD\n` +
                `Registration Number: ${regNum}\n` +
                `Registration Date: ${metadata.registration_date}\n` +
                `Business Address: 128 Main Road, Sandton, Johannesburg, 2196\n\n` +
                `Commissioner: Adv. Rory Voller`;
    } else {
      // Default fallback OCR
      metadata = {
        document_type: 'General Document',
        name: docName,
        detected_text_length: String(docName.length * 12)
      };
      ocrText = `DOCUMENT ANALYSIS SUMMARY\n` +
                `File Name: ${docName}\n` +
                `Detected Content Type: ${doc.fileType || 'Unspecified'}\n` +
                `File Size: ${Number(doc.fileSize)} bytes\n` +
                `Category: ${doc.category}\n` +
                `Processed Time: ${new Date().toLocaleString()}\n\n` +
                `Raw text content extraction was completed. No specific structural fields were matched for this document category.`;
    }

    // 5. Update database with completed status
    await prisma.document.update({
      where: { id: documentId },
      data: {
        ocrStatus: 'completed',
        ocrText,
        ocrMetadata: JSON.stringify(metadata)
      }
    });

    console.log(`OCR Simulation complete for document: ${documentId} (${cleanCategory})`);
  } catch (error) {
    console.error("Error in triggerOcrSimulation:", error);
    try {
      await prisma.document.update({
        where: { id: documentId },
        data: { ocrStatus: 'failed' }
      });
    } catch (dbErr) {
      console.error("Failed to set document OCR status to failed:", dbErr);
    }
  }
}

