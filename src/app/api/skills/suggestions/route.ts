import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  isRbacResponse,
  requireRoles,
  requireTenantSession,
} from '@/lib/rbac';

/**
 * GET — list skill suggestions for the tenant (pending by default).
 */
export async function GET(request: NextRequest) {
  const user = await requireTenantSession();
  if (isRbacResponse(user)) return user;
  const forbidden = requireRoles(user, ['administrator']);
  if (forbidden) return forbidden;

  const status = request.nextUrl.searchParams.get('status') || 'pending';
  const id = request.nextUrl.searchParams.get('id');

  try {
    if (id) {
      const suggestion = await prisma.skillSuggestion.findFirst({
        where: { id, tenantId: user.tenantId! },
      });
      if (!suggestion) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      return NextResponse.json({ data: suggestion });
    }

    const data = await prisma.skillSuggestion.findMany({
      where: {
        tenantId: user.tenantId!,
        ...(status !== 'all' ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PATCH — accept or dismiss a suggestion.
 */
export async function PATCH(request: NextRequest) {
  const user = await requireTenantSession();
  if (isRbacResponse(user)) return user;
  const forbidden = requireRoles(user, ['administrator']);
  if (forbidden) return forbidden;

  try {
    const body = await request.json();
    const { id, status } = body as { id?: string; status?: string };

    if (!id || !status || !['accepted', 'dismissed', 'pending'].includes(status)) {
      return NextResponse.json(
        { error: 'id and status (accepted|dismissed|pending) required' },
        { status: 400 }
      );
    }

    const existing = await prisma.skillSuggestion.findFirst({
      where: { id, tenantId: user.tenantId! },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updated = await prisma.skillSuggestion.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
