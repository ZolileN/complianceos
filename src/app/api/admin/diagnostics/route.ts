import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getQueueDepth, redis } from '@/lib/redis';

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string; tenantSlug?: string } | undefined;
  
  if (!session || user?.role !== 'administrator' || user?.tenantSlug !== 'praxisone') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const queueDepth = await getQueueDepth();
    let lastVacuumTimestamp: string | null = null;
    
    try {
      lastVacuumTimestamp = await redis.get('last_vacuum_timestamp');
    } catch (redisError) {
      console.error('Failed to retrieve last_vacuum_timestamp from Redis:', redisError);
    }

    return NextResponse.json({
      success: true,
      queueDepth,
      lastVacuumTimestamp
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to retrieve diagnostics';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
