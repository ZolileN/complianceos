/**
 * Shared tenant RBAC helpers for API routes.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import type { UserRole } from '@/types';

export type SessionUser = {
  id: string;
  email?: string | null;
  role: UserRole | string;
  tenantId?: string | null;
  tenantSlug?: string | null;
};

export const STAFF_ROLES: readonly string[] = [
  'administrator',
  'operations_manager',
  'consultant',
];

export const MANAGER_ROLES: readonly string[] = [
  'administrator',
  'operations_manager',
];

export async function requireTenantSession(): Promise<
  SessionUser | NextResponse
> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = session.user as SessionUser;
  if (!user.id || !user.tenantId) {
    return NextResponse.json({ error: 'No profile' }, { status: 403 });
  }
  return user;
}

export function isRbacResponse(
  value: SessionUser | NextResponse
): value is NextResponse {
  return value instanceof NextResponse;
}

export function requireRoles(
  user: SessionUser,
  allowed: readonly string[]
): NextResponse | null {
  if (!allowed.includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

export function requireStaff(user: SessionUser): NextResponse | null {
  return requireRoles(user, STAFF_ROLES);
}

export function requireManager(user: SessionUser): NextResponse | null {
  return requireRoles(user, MANAGER_ROLES);
}

export function isConsultant(user: SessionUser): boolean {
  return user.role === 'consultant';
}
