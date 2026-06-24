import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

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
        id: true,
        name: true,
        slug: true,
        plan: true,
        createdAt: true,
        whatsappSetupComplete: true,
        whatsappPhoneNumberId: true,
        whatsappVerifiedName: true,
        whatsappPhoneNumber: true,
        whatsappAccessToken: true,
        email: true,
        contactNumber: true,
        address: true,
        website: true,
      }
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Auto-backfill metadata from Meta's API if it is missing
    if (tenant.whatsappSetupComplete && tenant.whatsappPhoneNumberId && tenant.whatsappAccessToken && (!tenant.whatsappPhoneNumber || !tenant.whatsappVerifiedName)) {
      try {
        const verifyRes = await fetch(`https://graph.facebook.com/v21.0/${tenant.whatsappPhoneNumberId}?access_token=${tenant.whatsappAccessToken}`);
        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          const verifiedName = verifyData.verified_name || 'Connected Account';
          const displayPhoneNumber = verifyData.display_phone_number || '';
          
          await prisma.tenant.update({
            where: { id: tenantId },
            data: {
              whatsappVerifiedName: verifiedName,
              whatsappPhoneNumber: displayPhoneNumber
            }
          });

          tenant.whatsappVerifiedName = verifiedName;
          tenant.whatsappPhoneNumber = displayPhoneNumber;
        }
      } catch (err) {
        console.error('Failed to backfill WhatsApp metadata:', err);
      }
    }

    // Omit access token from client response
    const safeTenant = {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      createdAt: tenant.createdAt,
      whatsappSetupComplete: tenant.whatsappSetupComplete,
      whatsappPhoneNumberId: tenant.whatsappPhoneNumberId,
      whatsappVerifiedName: tenant.whatsappVerifiedName,
      whatsappPhoneNumber: tenant.whatsappPhoneNumber,
      email: tenant.email,
      contactNumber: tenant.contactNumber,
      address: tenant.address,
      website: tenant.website,
    };

    return NextResponse.json({ data: safeTenant });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error fetching company profile';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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
    const body = await request.json();
    const { name, slug, email, contactNumber, address, website } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Company Name is required' }, { status: 400 });
    }

    // If slug is provided, validate and update it
    let targetSlug = slug?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (!targetSlug) {
      targetSlug = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    }

    // Check slug uniqueness
    const existing = await prisma.tenant.findFirst({
      where: {
        slug: targetSlug,
        NOT: { id: tenantId }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'This slug or web address is already in use by another firm.' }, { status: 409 });
    }

    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: name.trim(),
        slug: targetSlug,
        email: email !== undefined ? (email?.trim() || null) : undefined,
        contactNumber: contactNumber !== undefined ? (contactNumber?.trim() || null) : undefined,
        address: address !== undefined ? (address?.trim() || null) : undefined,
        website: website !== undefined ? (website?.trim() || null) : undefined,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        createdAt: true,
        whatsappSetupComplete: true,
        whatsappPhoneNumberId: true,
        whatsappVerifiedName: true,
        whatsappPhoneNumber: true,
        email: true,
        contactNumber: true,
        address: true,
        website: true,
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error updating company profile';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
