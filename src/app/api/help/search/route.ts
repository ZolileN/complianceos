import { NextRequest, NextResponse } from 'next/server';

import { searchHelpArticles } from '@/lib/help-search';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q') || '').trim();
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '12', 10), 25);

  if (q.length < 2) {
    return NextResponse.json({ data: [], query: q });
  }

  return NextResponse.json({ data: searchHelpArticles(q, limit), query: q });
}
