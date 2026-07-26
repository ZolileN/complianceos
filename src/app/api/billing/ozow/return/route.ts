import { NextRequest, NextResponse } from 'next/server';

/**
 * Short Ozow browser return endpoint.
 * CancelUrl is limited to 50 chars, so we bounce through here to the billing UI.
 *
 * Query:
 *   r=c|e|s  — cancelled | error | success
 *   plan / pending — optional signup context
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const result = searchParams.get('r') || 'e';
  const plan = searchParams.get('plan');
  const pending = searchParams.get('pending');

  const billing =
    result === 'c' ? 'cancelled' : result === 's' ? 'success' : 'error';

  // Signup checkout returns to /signup; tenant upgrades return to billing page.
  if (pending || plan) {
    const dest = new URL('/signup', request.url);
    if (plan) dest.searchParams.set('plan', plan);
    dest.searchParams.set('billing', billing);
    if (pending) dest.searchParams.set('pending', pending);
    return NextResponse.redirect(dest);
  }

  const dest = new URL('/dashboard/billing', request.url);
  dest.searchParams.set('billing', billing);
  return NextResponse.redirect(dest);
}
