import { NextResponse } from 'next/server';
import {
  isRbacResponse,
  requireTenantSession,
} from '@/lib/rbac';
import { resolveEntitlements } from '@/lib/entitlements';
import { PLAN_CATALOG } from '@/lib/plans';

export async function GET() {
  const user = await requireTenantSession();
  if (isRbacResponse(user)) return user;

  try {
    const entitlements = await resolveEntitlements(user.tenantId!);
    return NextResponse.json({
      data: entitlements,
      catalog: Object.values(PLAN_CATALOG).map((p) => ({
        id: p.id,
        name: p.name,
        priceZarCents: p.priceZarCents,
        maxUsers: p.maxUsers,
        maxClients: p.maxClients,
        aiEnabled: p.aiEnabled,
        trialDays: p.trialDays,
        marketingBullets: p.marketingBullets,
      })),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resolve entitlements' },
      { status: 500 }
    );
  }
}
