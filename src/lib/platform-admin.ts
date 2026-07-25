/**
 * Shared platform-admin (PraxisAdmin) authorization helpers.
 * Master tenants: praxisone / mlk-computer-consulting administrators.
 *
 * Edge note: middleware must import constants from
 * `@/lib/platform-admin-constants` — this file pulls NextAuth/Node APIs.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { isPlatformAdmin } from '@/lib/platform-admin-constants';

export {
  PLATFORM_ADMIN_SLUGS,
  isPlatformAdmin,
  isPlatformAdminSlug,
} from '@/lib/platform-admin-constants';

export type PlatformAdminUser = {
  id: string;
  email?: string | null;
  role: string;
  tenantId?: string | null;
  tenantSlug?: string | null;
};

/** Session user if they are a platform admin; otherwise null. */
export async function getPlatformAdminSession(): Promise<PlatformAdminUser | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user as PlatformAdminUser | undefined;
  if (!user?.id || !isPlatformAdmin(user)) return null;
  return user;
}

/** Returns a 401/403 NextResponse if not platform admin; otherwise the admin user. */
export async function requirePlatformAdmin(): Promise<
  PlatformAdminUser | NextResponse
> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = session.user as PlatformAdminUser;
  if (!user.id || !isPlatformAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return user;
}

export function isPlatformAdminResponse(
  value: PlatformAdminUser | NextResponse
): value is NextResponse {
  return value instanceof NextResponse;
}
