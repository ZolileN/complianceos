/**
 * Shared platform-admin (PraxisAdmin) authorization helpers.
 * Master tenants: praxisone / mlk-computer-consulting administrators.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export const PLATFORM_ADMIN_SLUGS = ['praxisone', 'mlk-computer-consulting'] as const;

export type PlatformAdminUser = {
  id: string;
  email?: string | null;
  role: string;
  tenantId?: string | null;
  tenantSlug?: string | null;
};

export function isPlatformAdminSlug(slug: string | null | undefined): boolean {
  return !!slug && (PLATFORM_ADMIN_SLUGS as readonly string[]).includes(slug);
}

export function isPlatformAdmin(user: {
  role?: string | null;
  tenantSlug?: string | null;
} | null | undefined): boolean {
  return (
    user?.role === 'administrator' && isPlatformAdminSlug(user.tenantSlug)
  );
}

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
