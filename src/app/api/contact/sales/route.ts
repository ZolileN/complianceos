import { NextRequest, NextResponse } from 'next/server';
import { sendInquiryEmail } from '@/lib/contact-inquiry';

function parseInquiryBody(body: unknown) {
  const data = body as Record<string, unknown>;
  const name = String(data.name || '').trim();
  const email = String(data.email || '').trim().toLowerCase();
  const company = String(data.company || '').trim();
  const message = String(data.message || '').trim();

  if (!name || !email || !company || !message) {
    return { error: 'Please fill in all required fields' as const };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Please enter a valid email address' as const };
  }

  return { name, email, company, message };
}

export async function POST(request: NextRequest) {
  try {
    const parsed = parseInquiryBody(await request.json());
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const result = await sendInquiryEmail('sales', parsed);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Unable to send your inquiry right now. Please try again shortly.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Request failed';
    const status = msg.includes('not configured') ? 503 : 500;
    return NextResponse.json(
      {
        error:
          status === 503
            ? 'Contact sales is temporarily unavailable. Please try again later.'
            : 'Something went wrong. Please try again.',
      },
      { status }
    );
  }
}
