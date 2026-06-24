import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { AdminLogger } from '@/lib/admin-logs';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string }).role !== 'administrator') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        whatsappAccessToken: null,
        whatsappPhoneNumberId: null,
        whatsappSetupComplete: false,
        whatsappVerifiedName: null,
        whatsappPhoneNumber: null
      }
    });

    AdminLogger.log(
      'system',
      `Forced Meta credentials revocation for Tenant "${tenant.name}" (${tenant.slug})`,
      { tenantId: id }
    );

    return NextResponse.json({ success: true, data: tenant });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to revoke token';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
