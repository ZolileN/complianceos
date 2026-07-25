import { NextRequest, NextResponse } from 'next/server';
import {
  isPlatformAdminResponse,
  requirePlatformAdmin,
} from '@/lib/platform-admin';
import { getTenantLogs } from '@/lib/redis';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requirePlatformAdmin();
  if (isPlatformAdminResponse(admin)) return admin;

  try {
    const { id } = await params;
    const logs = await getTenantLogs(id);
    return NextResponse.json({ success: true, data: logs });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to retrieve tenant logs';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
