import { NextResponse } from 'next/server';
import {
  isPlatformAdminResponse,
  requirePlatformAdmin,
} from '@/lib/platform-admin';
import { AdminLogger } from '@/lib/admin-logs';

export async function GET() {
  const admin = await requirePlatformAdmin();
  if (isPlatformAdminResponse(admin)) return admin;

  try {
    const logs = AdminLogger.getLogs();
    return NextResponse.json({ success: true, data: logs });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch logs';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
