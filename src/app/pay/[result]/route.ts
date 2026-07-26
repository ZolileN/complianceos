import { NextRequest, NextResponse } from 'next/server';

/**
 * Ultra-short Ozow browser return paths.
 * CancelUrl is capped at 50 chars by Ozow, so we use /pay/c|/pay/e|/pay/s.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ result: string }> }
) {
  const { result } = await params;
  const code = result.toLowerCase();
  const billing =
    code === 'c' ? 'cancelled' : code === 's' ? 'success' : 'error';

  // Default: tenant billing return. Signup flows use SuccessUrl with pending id
  // (allowed up to 150 chars) via /api/billing/ozow/return.
  const dest = new URL('/dashboard/billing', request.url);
  dest.searchParams.set('billing', billing);
  return NextResponse.redirect(dest);
}
