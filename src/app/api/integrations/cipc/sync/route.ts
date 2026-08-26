import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { requireStaff } from '@/lib/rbac';
import { syncClientRegistry } from '@/lib/integrations/cipc/sync';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentUser = session.user as { tenantId: string; role: string; id: string };
  const forbidden = requireStaff(currentUser);
  if (forbidden) return forbidden;

  const tenantId = currentUser.tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  let body: { clientId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }

  const result = await syncClientRegistry(tenantId, body.clientId);
  if (!result.success) {
    return NextResponse.json({ error: result.error || 'Sync failed' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: result });
}
