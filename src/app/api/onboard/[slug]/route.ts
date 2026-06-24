import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTextMessage } from '@/lib/whatsapp';

// ── GET /api/onboard/[slug] ───────────────────────────────────────────────────
// Public endpoint: returns the tenant's display name so the onboarding
// page can show "You're onboarding with {Firm Name}".
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { name: true, slug: true },
  });

  if (!tenant) {
    return NextResponse.json({ error: 'Firm not found' }, { status: 404 });
  }

  return NextResponse.json({ firmName: tenant.name, slug: tenant.slug });
}

// ── POST /api/onboard/[slug] ──────────────────────────────────────────────────
// Public endpoint: receives the completed onboarding form and creates a
// Client record in the correct tenant with status "onboarding".
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { 
      id: true, 
      name: true,
      whatsappPhoneNumberId: true,
      whatsappAccessToken: true
    },
  });

  if (!tenant) {
    return NextResponse.json({ error: 'Firm not found' }, { status: 404 });
  }

  let body: {
    company_name: string;
    registration_number?: string;
    vat_number?: string;
    tax_number?: string;
    email?: string;
    phone?: string;
    whatsapp_number?: string;
    address?: string;
    directors?: Array<{ name: string; id_number: string }>;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { company_name, registration_number, vat_number, tax_number,
          email, phone, whatsapp_number, address, directors } = body;

  if (!company_name?.trim()) {
    return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
  }

  // ── Duplicate guard ───────────────────────────────────────────────────────
  const existing = await prisma.client.findFirst({
    where: {
      tenantId: tenant.id,
      companyName: { equals: company_name.trim(), mode: 'insensitive' },
    },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json(
      { error: 'A client with this company name has already been registered with this firm.' },
      { status: 409 }
    );
  }

  // ── Create client record ──────────────────────────────────────────────────
  const client = await prisma.client.create({
    data: {
      tenantId: tenant.id,
      companyName: company_name.trim(),
      registrationNumber: registration_number?.trim() || null,
      vatNumber: vat_number?.trim() || null,
      taxNumber: tax_number?.trim() || null,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      whatsappNumber: whatsapp_number?.trim() || null,
      address: address?.trim() || null,
      directors: directors && directors.length > 0
        ? JSON.stringify(directors.filter(d => d.name?.trim()))
        : '[]',
      status: 'onboarding',
    },
  });

  // ── WhatsApp welcome message (fire-and-forget, non-blocking) ─────────────
  if (whatsapp_number?.trim()) {
    const sanitised = whatsapp_number.trim().replace(/\D/g, '');
    const welcomeMsg =
      `👋 Hi! Welcome to *${tenant.name}*.\n\n` +
      `We've received your onboarding details for *${company_name.trim()}* and your profile is now being set up. ` +
      `A consultant will be in touch shortly to guide you through the next steps.\n\n` +
      `Thank you for choosing us! 🙏`;

    const credentials = tenant.whatsappPhoneNumberId && tenant.whatsappAccessToken
      ? { phoneNumberId: tenant.whatsappPhoneNumberId, accessToken: tenant.whatsappAccessToken }
      : undefined;

    sendTextMessage(sanitised, welcomeMsg, credentials).catch(err => {
      console.warn('[Onboarding] WhatsApp welcome message failed (non-critical):', err?.message);
    });
  }

  return NextResponse.json({ success: true, clientId: client.id }, { status: 201 });
}
