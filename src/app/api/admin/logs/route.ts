import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { AdminLogger } from '@/lib/admin-logs';

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string; tenantSlug?: string } | undefined;
  if (!session || user?.role !== 'administrator' || !['praxisone', 'mlk-computer-consulting'].includes(user?.tenantSlug as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const logs = AdminLogger.getLogs();
    return NextResponse.json({ success: true, data: logs });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch logs';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
