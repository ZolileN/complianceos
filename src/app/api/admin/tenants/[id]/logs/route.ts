import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getTenantLogs } from '@/lib/redis';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string; tenantSlug?: string } | undefined;
  
  if (!session || user?.role !== 'administrator' || user?.tenantSlug !== 'praxisone') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const logs = await getTenantLogs(id);
    return NextResponse.json({ success: true, data: logs });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to retrieve tenant logs';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
