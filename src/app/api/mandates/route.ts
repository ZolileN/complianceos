import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isRbacResponse, requireStaff, requireTenantSession } from '@/lib/rbac';
import { assertWritable, ReadOnlyError, readOnlyResponse } from '@/lib/entitlements';
import { sendMandateSignRequestEmail } from '@/lib/email';
import { getAppBaseUrl } from '@/lib/appUrl';

export async function GET(request: NextRequest) {
  const user = await requireTenantSession();
  if (isRbacResponse(user)) return user;
  const forbidden = requireStaff(user);
  if (forbidden) return forbidden;

  const clientId = request.nextUrl.searchParams.get('client_id');
  const status = request.nextUrl.searchParams.get('status');

  const data = await prisma.mandate.findMany({
    where: {
      tenantId: user.tenantId!,
      ...(clientId ? { clientId } : {}),
      ...(status ? { status } : {}),
    },
    include: { client: { select: { id: true, companyName: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const user = await requireTenantSession();
  if (isRbacResponse(user)) return user;
  const forbidden = requireStaff(user);
  if (forbidden) return forbidden;

  try {
    await assertWritable(user.tenantId!);
  } catch (err) {
    if (err instanceof ReadOnlyError) return readOnlyResponse(err);
    throw err;
  }

  const body = await request.json();
  const { clientId, title, description, signerEmail, signerName, expiresInDays } = body as {
    clientId?: string;
    title?: string;
    description?: string;
    signerEmail?: string;
    signerName?: string;
    expiresInDays?: number;
  };

  if (!clientId || !title) {
    return NextResponse.json({ error: 'clientId and title required' }, { status: 400 });
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId: user.tenantId! },
    select: { companyName: true, email: true },
  });
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

  const signToken = randomBytes(24).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (expiresInDays || 14));

  const email = signerEmail || client.email;
  const mandate = await prisma.mandate.create({
    data: {
      tenantId: user.tenantId!,
      clientId,
      title,
      description: description || null,
      signToken,
      signerEmail: email || null,
      signerName: signerName || null,
      expiresAt,
      createdById: user.id,
    },
    include: { client: { select: { companyName: true } } },
  });

  if (email) {
    const signUrl = `${getAppBaseUrl()}/sign/${signToken}`;
    await sendMandateSignRequestEmail(email, {
      clientName: client.companyName,
      mandateTitle: title,
      signUrl,
      expiresAt,
    });
  }

  return NextResponse.json({
    data: {
      ...mandate,
      signUrl: `${getAppBaseUrl()}/sign/${signToken}`,
    },
  }, { status: 201 });
}
