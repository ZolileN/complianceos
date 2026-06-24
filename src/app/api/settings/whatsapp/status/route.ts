import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = (session.user as { tenantId: string }).tenantId;
  if (!tenantId) {
    return NextResponse.json({ error: 'No profile' }, { status: 403 });
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        whatsappSetupComplete: true,
        whatsappPhoneNumberId: true,
        whatsappVerifiedName: true,
        whatsappPhoneNumber: true,
      }
    });

    return NextResponse.json({
      connected: tenant?.whatsappSetupComplete || false,
      phoneNumberId: tenant?.whatsappPhoneNumberId || null,
      verifiedName: tenant?.whatsappVerifiedName || null,
      phoneNumber: tenant?.whatsappPhoneNumber || null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error fetching status';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = (session.user as { tenantId: string }).tenantId;
  const userRole = (session.user as { role: string }).role;
  if (!tenantId) {
    return NextResponse.json({ error: 'No profile' }, { status: 403 });
  }

  if (userRole !== 'administrator' && userRole !== 'operations_manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        whatsappPhoneNumberId: null,
        whatsappAccessToken: null,
        whatsappSetupComplete: false,
        whatsappVerifiedName: null,
        whatsappPhoneNumber: null,
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error resetting credentials';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
