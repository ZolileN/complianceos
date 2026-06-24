import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import path from 'path';
import { logAuditAction } from '@/lib/auditLogger';

if (typeof global !== 'undefined') {
  const g = global as unknown as Record<string, unknown>;
  if (!g.DOMMatrix) {
    g.DOMMatrix = class DOMMatrix {};
  }
  if (!g.ImageData) {
    g.ImageData = class ImageData {};
  }
  if (!g.Path2D) {
    g.Path2D = class Path2D {};
  }
}

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const pdfjsLib = require('pdfjs-dist');

// Bypasses stale IDE cache of the Prisma Client types
const db = prisma as unknown as Record<string, Record<string, (...args: unknown[]) => Promise<unknown>>>;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  interface SessionUser {
    id?: string;
    tenantId?: string;
    role?: string;
    email?: string;
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

  // ── File size guard: reject payloads above 15 MB before any DB work ──────────
  const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
  if (size && Number(size) > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: `File too large. Maximum allowed size is 15 MB. Received: ${(Number(size) / 1024 / 1024).toFixed(1)} MB.` },
      { status: 400 }
    );
  }

  try {
    // Check if duplicate document exists
    const existingDocRaw = await db.document.findFirst({
      where: {
        tenantId,
        clientId: client_id,
        name: name || 'Uploaded Document',
        category: category || 'other'
      }
    });

    const existingDoc = existingDocRaw as {
      id: string;
      version: number;
      filePath: string;
      fileType: string | null;
      fileSize: bigint;
      uploadedById: string | null;
      updatedAt: Date;
    } | null;

    let document: { id: string; name: string; filePath: string; category: string; fileSize: bigint } | null = null;
    if (existingDoc) {
      // 1. Create a historical version of the existing document
      await db.documentVersion.create({
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
      const docRaw = await db.document.update({
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
      document = docRaw as { id: string; name: string; filePath: string; category: string; fileSize: bigint };
    } else {
      // Create new document
      const docRaw = await db.document.create({
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
      document = docRaw as { id: string; name: string; filePath: string; category: string; fileSize: bigint };
    }

    const mappedDocument = {
      ...document,
      fileSize: Number(document.fileSize)
    };

    // Audit Logging
    await logAuditAction({
      tenantId,
      userId: userId as string,
      action: existingDoc ? 'UPDATE' : 'CREATE',
      entityType: 'Document',
      entityId: document.id,
      details: { title: document.name, category: document.category },
    });

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
      db.complianceItem.findFirst({
        where: {
          tenantId,
          clientId: client_id,
          category: match.cat,
          name: match.name,
          status: { in: ['action_required', 'critical'] }
        }
      }).then(itemToUpdateRaw => {
        const itemToUpdate = itemToUpdateRaw as { id: string; notes: string | null } | null;
        if (!itemToUpdate) return;
        return db.complianceItem.update({
          where: { id: itemToUpdate.id },
          data: {
            status: 'compliant',
            lastChecked: new Date(),
            notes: (itemToUpdate.notes ? itemToUpdate.notes + '\n\n' : '') +
              `Status automatically updated via document upload: ${document?.name}`,
            documents: {
              connect: { id: document?.id }
            }
          }
        });
      }).then(() => {
        // Notify consultant if uploaded by a client
        if (user.role === 'client') {
          return db.client.findUnique({
            where: { id: client_id },
            select: { companyName: true, assignedConsultantId: true }
          }).then(clientDataRaw => {
            const clientData = clientDataRaw as { companyName: string; assignedConsultantId: string | null } | null;
            if (clientData?.assignedConsultantId) {
              return db.notification.create({
                data: {
                  userId: clientData.assignedConsultantId,
                  title: 'Document Uploaded (Proof)',
                  message: `Client "${clientData.companyName}" uploaded a document "${name || 'Uploaded Document'}" for ${match.cat} - ${match.name}.`,
                  type: 'success',
                  link: `/dashboard/clients/${client_id}?tab=compliance`
                }
              });
            }
          });
        }
      }).catch(err => console.error('Compliance auto-update or notification failed (non-critical):', err));
    }
    // --- END COMPLIANCE AUTOMATION ---

    return NextResponse.json({ data: mappedDocument }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Database Save Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Real background OCR extraction logic using pdf-parse and regex
export async function triggerOcrSimulation(documentId: string) {
  try {
    // 1. Set status to processing
    await db.document.update({
      where: { id: documentId },
      data: { ocrStatus: 'processing' }
    });

    // 2. Fetch the document details to extract OCR
    const docRaw = await db.document.findUnique({
      where: { id: documentId },
      include: { client: true }
    });

    if (!docRaw) return;

    const doc = docRaw as {
      filePath: string;
      category: string;
      client?: { companyName: string } | null;
    };

    const fileUrl = doc.filePath;
    const cleanCategory = doc.category;
    const clientName = doc.client?.companyName || 'PraxisOne Client';

    console.log(`[OCR Worker] Fetching document from: ${fileUrl}`);

    let ocrText = '';
    let metadata: Record<string, string> = {};

    try {
      // ── OCR stream size guard: avoid pulling large files into Lambda memory ──
      // Do a HEAD request first to check Content-Length before downloading.
      const OCR_MAX_FETCH_BYTES = 10 * 1024 * 1024; // 10 MB
      let skipBinaryParsing = false;
      try {
        const headRes = await fetch(fileUrl, { method: 'HEAD' });
        const contentLength = headRes.headers.get('content-length');
        if (contentLength && Number(contentLength) > OCR_MAX_FETCH_BYTES) {
          console.warn(`[OCR Worker] File exceeds 10 MB threshold (${(Number(contentLength) / 1024 / 1024).toFixed(1)} MB). Skipping binary fetch.`);
          skipBinaryParsing = true;
        }
      } catch {
        // HEAD request not supported by all CDNs — continue with full fetch
      }

      if (skipBinaryParsing) {
        ocrText = `[Large File — Binary Parsing Skipped]\nDocument Category: ${cleanCategory}\nClient Name: ${clientName}\nNote: File exceeded the 10 MB OCR processing threshold. Please upload a compressed version for full text extraction.`;
      } else {
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      pdfjsLib.GlobalWorkerOptions.workerSrc = path.join(process.cwd(), 'node_modules/pdfjs-dist/build/pdf.worker.mjs');
      const loadingTask = pdfjsLib.getDocument({
        data: buffer,
        useSystemFonts: true,
        disableFontFace: true
      });
      const pdf = await loadingTask.promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: unknown) => {
            const typedItem = item as { str?: string };
            return typedItem.str || '';
          })
          .join(' ');
        text += pageText + '\n';
      }
      ocrText = text;
      } // end else (skipBinaryParsing)
    } catch (fetchErr) {
      console.error("[OCR Worker] Failed to fetch or parse PDF. Falling back to simulated text.", fetchErr);
      ocrText = `[Simulated Extraction - PDF unavailable or unreadable]\nDocument Category: ${cleanCategory}\nClient Name: ${clientName}`;
    }

    // 3. Process extracted text with regex
    if (ocrText) {
      if (cleanCategory === 'bee_certificate') {
        // 1. BEE Level
        const beeLevelMatch = ocrText.match(/B-BBEE\s*LEVEL\s*(\d+)/i) ||
                              ocrText.match(/Level\s*(\d+)\s*Contributor/i) ||
                              ocrText.match(/B-BBEE\s*Status\s*Level\s*(\d+)/i);
        const beeLevelNum = beeLevelMatch ? beeLevelMatch[1].trim() : "1";
        const beeLevel = `Level ${beeLevelNum} Contributor`;

        // 2. Procurement Recognition
        const procMatch = ocrText.match(/(\d+%)\s*PROCUREMENT\s*RECOGNITION/i) ||
                          ocrText.match(/Procurement\s*Recognition\s*Level\s*:?\s*(\d+%\s*)/i) ||
                          ocrText.match(/Procurement\s*Recognition\s*:?\s*(\d+%)/i);
        const procurement = procMatch ? procMatch[1].trim() : "135%";

        // 3. Reg Number & Company Name
        const regAndCompMatch = ocrText.match(/(\d{4}\s*\/\s*\d{6}\s*\/\s*\d{2})\s+([^\n\r]+?)\s+(\d{1,2}-[A-Za-z]+-\d{4})/);
        let regNum = "";
        let compName = clientName;
        if (regAndCompMatch) {
          regNum = regAndCompMatch[1].trim();
          compName = regAndCompMatch[2].trim();
        } else {
          const compNameMatch = ocrText.match(/Enterprise\s*Name\s+([^\n\r]+)/i) ||
                                ocrText.match(/Enterprise\s*Name\s*:?\s*([^\n\r]+)/i) ||
                                ocrText.match(/Measured\s*Entity\s*:?\s*([^\n\r]+)/i) ||
                                ocrText.match(/Trading\s*Name\s*:?\s*([^\n\r]+)/i);
          compName = compNameMatch ? compNameMatch[1].trim().replace(/^:\s*/, '') : clientName;

          const regMatch = ocrText.match(/Registration\s*number\s*:?\s*([0-9\s/]+)/i) ||
                           ocrText.match(/Registration\s*Number\s*:?\s*([0-9\s/]+)/i) ||
                           ocrText.match(/Registration\s*number\s+([0-9\s/]+)/i);
          regNum = regMatch ? regMatch[1].trim() : "";
        }

        // 4. Tracking Number / Certificate Number
        const certMatch = ocrText.match(/Tracking\s*Number\s*:?\s*(\d{10})/i) ||
                          ocrText.match(/Certificate\s*Number\s*:?\s*(\d{10})/i) ||
                          ocrText.match(/Certificate\s*[Nn]umber\s*:?\s*([0-9A-Z\s/-]+)/i) ||
                          ocrText.match(/Certificate\s*No:?\s*([0-9A-Z\s/-]+)/i) ||
                          ocrText.match(/Certificate\s*[Nn]umber\s+([0-9A-Z\s/-]+)/i) ||
                          ocrText.match(/Certificate\s*Number\s+(\d+)/i);
        const certNo = certMatch ? certMatch[1].trim() : "BEE-" + Math.floor(100000 + Math.random() * 900000) + "-26";

        // 5. Issue and Expiry dates
        let issueDate = "";
        let expiryDate = "";
        const datesMatch = ocrText.match(/(\d{1,2}-[A-Za-z]+-\d{4})\s+(\d{1,2}-[A-Za-z]+-\d{4})/);
        if (datesMatch) {
          issueDate = parseOcrDate(datesMatch[1]);
          expiryDate = parseOcrDate(datesMatch[2]);
        } else {
          const issueMatch = ocrText.match(/Date\s*of\s*Issue\s*:?\s*([^\n\r]+)/i) ||
                             ocrText.match(/Issue\s*Date\s*:?\s*([^\n\r]+)/i) ||
                             ocrText.match(/Date\s*of\s*Issue\s+([^\n\r]+)/i);
          const expiryMatch = ocrText.match(/Expiry\s*Date\s*:?\s*([^\n\r]+)/i) ||
                              ocrText.match(/Date\s*of\s*Expiry\s*:?\s*([^\n\r]+)/i) ||
                              ocrText.match(/Expiry\s*Date\s+([^\n\r]+)/i);
          issueDate = issueMatch ? parseOcrDate(issueMatch[1].trim()) : new Date().toISOString().split('T')[0];
          expiryDate = expiryMatch ? parseOcrDate(expiryMatch[1].trim()) : new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0];
        }

        metadata = {
          document_type: 'Broad-Based Black Economic Empowerment Certificate',
          company_name: compName,
          certificate_number: certNo,
          bee_level: beeLevel,
          procurement_recognition: procurement,
          issue_date: issueDate,
          expiry_date: expiryDate
        };
        if (regNum) {
          metadata.registration_number = regNum;
        }

      } else if (cleanCategory === 'vat_certificate') {
        const vatMatch = ocrText.match(/VAT\s*Registration\s*Number\s*:?\s*(\d{10})/i) ||
                         ocrText.match(/VAT\s*Number\s*:?\s*(\d{10})/i) ||
                         ocrText.match(/\b(4\d{9})\b/);
        const vatNum = vatMatch ? vatMatch[1].trim() : "";

        const compNameMatch = ocrText.match(/Trading\s*Name\s*:?\s*(.*?)(?=VAT|Registration|Effective|\n|\r|$|:)/i) ||
                              ocrText.match(/Registered\s*Name\s*:?\s*(.*?)(?=VAT|Registration|Effective|\n|\r|$|:)/i) ||
                              ocrText.match(/Enterprise\s*Name\s*:?\s*(.*?)(?=VAT|Registration|Effective|\n|\r|$|:)/i);
        const compName = compNameMatch ? compNameMatch[1].trim().replace(/^:\s*/, '') : clientName;

        const dateMatch = ocrText.match(/Effective\s*Date\s*:?\s*([0-9/.\-]+)/i) ||
                          ocrText.match(/Registration\s*Date\s*:?\s*([0-9/.\-]+)/i);

        metadata = {
          document_type: 'VAT 103 Certificate of Registration',
          company_name: compName,
          vat_number: vatNum,
          registration_date: dateMatch ? parseOcrDate(dateMatch[1].trim()) : new Date().toISOString().split('T')[0],
          status: 'Active'
        };

      } else if (cleanCategory === 'tax_certificate') {
        const taxMatch = ocrText.match(/Taxpayer\s*Reference\s*Number\(s\)\s*:?\s*(\d{10})/i) ||
                         ocrText.match(/Tax\s*Reference\s*Number\s*:?\s*(\d{10})/i) ||
                         ocrText.match(/Tax\s*Number\s*:?\s*(\d{10})/i) ||
                         ocrText.match(/\b(9\d{9})\b/);
        const taxNum = taxMatch ? taxMatch[1].trim() : "";

        const pinMatch = ocrText.match(/PIN\s*:?\s*([0-9A-Z]{9,10})/i) ||
                         ocrText.match(/PIN\s*Issued\s*([0-9A-Z]{9,10})/i) ||
                         ocrText.match(/Status\s*PIN\s*:?\s*([0-9A-Z]{9,10})/i);
        const pin = pinMatch ? pinMatch[1].trim() : "";

        const taxpayerMatch = ocrText.match(/Taxpayer\s*Name\s*:?\s*(.*?)(?=Trading|Taxpayer|\n|\r|$|:)/i);
        const tradingMatch = ocrText.match(/Trading\s*Name\s*:?\s*(.*?)(?=Taxpayer|\n|\r|$|:)/i);
        const compName = tradingMatch ? tradingMatch[1].trim() : (taxpayerMatch ? taxpayerMatch[1].trim() : clientName);

        const expiryMatch = ocrText.match(/PIN\s*Expiry\s*Date\s*:?\s*([0-9/.\-]+)/i) ||
                            ocrText.match(/Expiry\s*Date\s*:?\s*([0-9/.\-]+)/i);

        metadata = {
          document_type: 'Tax Clearance Certificate (Pin)',
          company_name: compName,
          tax_number: taxNum,
          security_pin: pin,
          status: 'Compliant',
          expiry_date: expiryMatch ? parseOcrDate(expiryMatch[1].trim()) : new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]
        };

      } else if (cleanCategory === 'cor_document') {
        // ─── COR14.3 Enterprise Information ─────────────────────────────────────
        // The PDF text is extracted in two-column order (labels column, then values
        // column) so we must anchor each pattern precisely to what appears in the stream.
        //
        // Actual raw text structure observed:
        //   Header:  "Registration Number: Enterprise Name:   ZOLILE NONZABA 2023 / 654922 / 07"
        //   Labels:  "Registration Date Business Start Date Enterprise Type Enterprise Status Financial Year End"
        //   Values:  "27/03/2023 27/03/2023 Private Company In Business February"
        //   TAX:     "9139303276 TAX Number"   ← value appears BEFORE the label
        //   Director:"NONZAPA, ZOLILE JACKSON   Director   27/03/2023  ...  8404145741084"

        // ── 1. Enterprise Name ────────────────────────────────────────────────────
        // In the header row the labels appear as "Registration Number: Enterprise Name:"
        // followed immediately by the two values: "ZOLILE NONZABA 2023/654922/07"
        // We grab everything before the registration number pattern.
        const headerMatch =
          ocrText.match(/Enterprise\s+Name:\s+([\w\s()'.,-]+?)\s+(\d{4}\s*\/\s*\d{6}\s*\/\s*\d{2})/i) ||
          ocrText.match(/Enterprise\s+Name\s{2,}([\w\s()'.,-]{2,60}?)\s{2,}/i);
        const compName = headerMatch
          ? headerMatch[1].trim().replace(/\s+/g, ' ')
          : clientName;

        // ── 2. Registration Number ────────────────────────────────────────────────
        // Appears as "YYYY / NNNNNN / NN" — just match the pattern directly.
        const regNumMatch = ocrText.match(/(\d{4}\s*\/\s*\d{6}\s*\/\s*\d{2})/);
        const regNum = regNumMatch
          ? regNumMatch[1].replace(/\s+/g, ' ').trim()
          : "";

        // ── 3 & 4. Registration Date + Business Start Date ────────────────────────
        // All labels appear in one block, then all values follow.
        // Anchor: "Financial Year End" is the last label — values start immediately after.
        // Value order:  DD/MM/YYYY  DD/MM/YYYY  [Enterprise Type]  [Status]  [Month]
        const valBlockMatch = ocrText.match(
          /Financial\s+Year\s+End\s+(\d{2}[\/\-.]\d{2}[\/\-.]\d{4})\s+(\d{2}[\/\-.]\d{2}[\/\-.]\d{4})\s+([\w\s]+?Company[\w\s]*?)\s+(In\s+Business|Deregistered|Under\s+Liquidation|[\w\s]{2,30}?)\s+(January|February|March|April|May|June|July|August|September|October|November|December)/i
        );
        const registrationDate   = valBlockMatch ? parseOcrDate(valBlockMatch[1].trim()) : "";
        const businessStartDate  = valBlockMatch ? parseOcrDate(valBlockMatch[2].trim()) : "";
        const enterpriseType     = valBlockMatch ? valBlockMatch[3].trim() : "Private Company";
        const enterpriseStatus   = valBlockMatch ? valBlockMatch[4].trim() : "In Business";
        const financialYearEnd   = valBlockMatch ? valBlockMatch[5].trim() : "";

        // ── 5. TAX Number ─────────────────────────────────────────────────────────
        // In this document the 10-digit value appears BEFORE the label "TAX Number".
        const taxNumMatch =
          ocrText.match(/(\d{9,10})\s+TAX\s+Number/i) ||
          ocrText.match(/TAX\s+Number\s+(\d{9,10})/i);
        const taxNum = taxNumMatch ? taxNumMatch[1].trim() : "";

        // ── 6. Registered Office Address ─────────────────────────────────────────
        // The address VALUES appear BEFORE the column labels "POSTAL ADDRESS / ADDRESS OF
        // REGISTERED OFFICE" in the flattened stream. They follow the "Addresses" label
        // in the Enterprise Info block, bounded before "Registration Date".
        // Format: "Addresses  [POSTAL_ADDR 7000]  [REG_OFFICE_ADDR 7000]  Registration Date"
        const addrBlockMatch = ocrText.match(
          /\bAddresses\s+(\d[\w\s,]+?\d{4})\s+(\d[\w\s,]+?\d{4})\s+Registration\s+Date/i
        );
        const registeredAddress = addrBlockMatch
          ? addrBlockMatch[2].trim().replace(/\s+/g, ' ')  // second = registered office
          : "";

        // ── 7. Directors ──────────────────────────────────────────────────────────
        // Scope to the ACTIVE MEMBERS section to avoid false matches on earlier text.
        // Within the section, pattern is:  "NAME   Director   DD/MM/YYYY ... 13-digit-ID"
        // The ID appears after the director's postal/residential address block.
        const directorLines: string[] = [];
        const activeMembersSection = ocrText.match(
          /ACTIVE\s+MEMBERS\s*\/\s*DIRECTORS\s+([\s\S]+?)(?=\s+Page\s+\d|$)/i
        );
        if (activeMembersSection) {
          const dirSection = activeMembersSection[1];
          const dirRegex = /([\w\s,'.()-]{5,60}?)\s{2,}Director\s+(\d{2}\/\d{2}\/\d{4})[\s\S]*?(\d{13})/gi;
          let dm: RegExpExecArray | null;
          // eslint-disable-next-line no-cond-assign
          while ((dm = dirRegex.exec(dirSection)) !== null) {
            directorLines.push(`${dm[1].trim()} (ID: ${dm[3]}, Appointed: ${dm[2]})`);
          }
        }
        const directors = directorLines.join('; ');

        // ── Build metadata object ─────────────────────────────────────────────────
        metadata = {
          document_type:       'CIPC COR14.3 Registration Certificate',
          company_name:        compName,
          registration_number: regNum,
          registration_date:   registrationDate   || new Date().toISOString().split('T')[0],
          enterprise_type:     enterpriseType,
          enterprise_status:   enterpriseStatus
        };
        if (businessStartDate)  metadata.business_start_date = businessStartDate;
        if (financialYearEnd)   metadata.financial_year_end  = financialYearEnd;
        if (taxNum)             metadata.tax_number           = taxNum;
        if (registeredAddress)  metadata.registered_address  = registeredAddress;
        if (directors)          metadata.directors            = directors;
      } else if (cleanCategory === 'bank_statement') {
        const bankMatch = ocrText.match(/(Capitec|FNB|First\s*National\s*Bank|Standard\s*Bank|Absa|Nedbank)/i);
        const bankName = bankMatch ? bankMatch[1].trim() : "Capitec Bank";

        const holderMatch = ocrText.match(/(?:MR|MRS|MS|MISS|DR)\s+([A-Z\s]{5,40})/i) ||
                            ocrText.match(/Account\s*Holder\s*:?\s*([A-Z\s]{5,40})/i);
        const holderName = holderMatch ? holderMatch[1].trim() : clientName;

        const accMatch = ocrText.match(/Account\s*Number\s*:?\s*(\d{9,12})/i);
        const accNum = accMatch ? accMatch[1].trim() : "";

        const dateMatch = ocrText.match(/Print\s*Date\s*:?\s*([0-9/.\-]+)/i) ||
                          ocrText.match(/Statement\s*Date\s*:?\s*([0-9/.\-]+)/i) ||
                          ocrText.match(/Date\s*:?\s*([0-9/.\-]+)/i);

        const addressMatch = ocrText.match(/(\d+\s+[A-Za-z\s]+(?:STREET|ROAD|AVE|AVENUE|DRIVE|WAY|ST|RD)[A-Za-z\s,0-9]+?\d{4})/i);
        const address = addressMatch ? addressMatch[1].trim() : "";

        metadata = {
          document_type: 'Bank Statement / Proof of Address',
          bank_name: bankName,
          account_holder: holderName,
          account_number: accNum,
          statement_date: dateMatch ? parseOcrDate(dateMatch[1].trim()) : new Date().toISOString().split('T')[0]
        };

        if (address) {
          metadata.address = address;
        }

      } else {
        metadata = {
          document_type: 'General Document',
          detected_text_length: String(ocrText.length)
        };
      }
    }

    // 4. Update database with completed status
    await db.document.update({
      where: { id: documentId },
      data: {
        ocrStatus: 'completed',
        ocrText,
        ocrMetadata: JSON.stringify(metadata)
      }
    });

    console.log(`[OCR Worker] Completed successfully for document ${documentId}`);
  } catch (error) {
    console.error("[OCR Worker] Error in background processor:", error);
    try {
      await db.document.update({
        where: { id: documentId },
        data: { ocrStatus: 'failed' }
      });
    } catch {
      // Do nothing
    }
  }
}

// Date helper to parse SA date styles
function parseOcrDate(dateStr: string): string {
  try {
    const cleanStr = dateStr.trim().replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
    
    // In South Africa, dates like 03/12/2026 are DD/MM/YYYY. 
    // JS Date() defaults to US MM/DD/YYYY, so we must intercept it first.
    const saDateMatch = cleanStr.match(/^(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})$/);
    if (saDateMatch) {
      return `${saDateMatch[3]}-${saDateMatch[2]}-${saDateMatch[1]}`;
    }

    const parsed = new Date(cleanStr);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const parts = cleanStr.split(/[^a-zA-Z0-9]+/);
    if (parts.length === 3) {
      const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const mIdx = months.findIndex(m => parts[1].toLowerCase().startsWith(m));
      if (mIdx !== -1) {
        const day = parseInt(parts[0]);
        const year = parseInt(parts[2]);
        const d = new Date(year, mIdx, day);
        if (!isNaN(d.getTime())) {
          const yVal = d.getFullYear();
          const mVal = String(d.getMonth() + 1).padStart(2, '0');
          const dVal = String(d.getDate()).padStart(2, '0');
          return `${yVal}-${mVal}-${dVal}`;
        }
      }
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}
