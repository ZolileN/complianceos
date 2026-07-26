import { describe, expect, it } from 'vitest';
import { NextResponse } from 'next/server';
import {
  requireManager,
  requireRoles,
  requireStaff,
  type SessionUser,
} from '@/lib/rbac';

function user(role: string): SessionUser {
  return {
    id: 'u1',
    role,
    tenantId: 't1',
    tenantSlug: 'demo',
  };
}

describe('rbac helpers', () => {
  it('requireRoles allows listed roles', () => {
    expect(requireRoles(user('administrator'), ['administrator'])).toBeNull();
  });

  it('requireRoles forbids other roles', () => {
    const res = requireRoles(user('consultant'), ['administrator']);
    expect(res).toBeInstanceOf(NextResponse);
    expect(res?.status).toBe(403);
  });

  it('requireStaff allows consultant and managers', () => {
    expect(requireStaff(user('consultant'))).toBeNull();
    expect(requireStaff(user('operations_manager'))).toBeNull();
  });

  it('requireStaff forbids clients', () => {
    const res = requireStaff(user('client'));
    expect(res).toBeInstanceOf(NextResponse);
    expect(res?.status).toBe(403);
  });

  it('requireManager forbids consultants', () => {
    const res = requireManager(user('consultant'));
    expect(res).toBeInstanceOf(NextResponse);
    expect(res?.status).toBe(403);
  });
});
