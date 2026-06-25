import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string; tenantSlug?: string } | undefined;
  if (!session || user?.role !== 'administrator' || !['praxisone', 'mlk-computer-consulting'].includes(user?.tenantSlug as string)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        isActive: true,
        createdAt: true,
        whatsappPhoneNumberId: true,
        whatsappSetupComplete: true,
        _count: {
          select: {
            users: true,
            clients: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: tenants });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch tenants';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
