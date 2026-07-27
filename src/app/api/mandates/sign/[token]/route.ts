import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteCtx = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const { token } = await params;
  const mandate = await prisma.mandate.findUnique({
    where: { signToken: token },
    include: {
      client: { select: { companyName: true } },
      tenant: { select: { name: true } },
    },
  });

  if (!mandate || mandate.status === 'void') {
    return NextResponse.json({ error: 'Mandate not found' }, { status: 404 });
  }
  if (mandate.status === 'signed') {
    return NextResponse.json({ data: { ...mandate, alreadySigned: true } });
  }
  if (mandate.expiresAt && mandate.expiresAt < new Date()) {
    await prisma.mandate.update({ where: { id: mandate.id }, data: { status: 'expired' } });
    return NextResponse.json({ error: 'This signing link has expired' }, { status: 410 });
  }

  return NextResponse.json({
    data: {
      title: mandate.title,
      description: mandate.description,
      clientName: mandate.client.companyName,
      firmName: mandate.tenant.name,
      signerName: mandate.signerName,
      signerEmail: mandate.signerEmail,
      status: mandate.status,
    },
  });
}

export async function POST(request: NextRequest, { params }: RouteCtx) {
  const { token } = await params;
  const body = await request.json();
  const { typedName, signerEmail } = body as { typedName?: string; signerEmail?: string };

  if (!typedName?.trim()) {
    return NextResponse.json({ error: 'typedName required' }, { status: 400 });
  }

  const mandate = await prisma.mandate.findUnique({ where: { signToken: token } });
  if (!mandate || mandate.status === 'void') {
    return NextResponse.json({ error: 'Mandate not found' }, { status: 404 });
  }
  if (mandate.status === 'signed') {
    return NextResponse.json({ data: { signed: true } });
  }
  if (mandate.expiresAt && mandate.expiresAt < new Date()) {
    await prisma.mandate.update({ where: { id: mandate.id }, data: { status: 'expired' } });
    return NextResponse.json({ error: 'This signing link has expired' }, { status: 410 });
  }

  const userAgent = request.headers.get('user-agent') || '';
  const signatureData = JSON.stringify({
    typedName: typedName.trim(),
    signerEmail: signerEmail?.trim() || mandate.signerEmail,
    signedAt: new Date().toISOString(),
    userAgent,
  });

  const updated = await prisma.mandate.update({
    where: { id: mandate.id },
    data: {
      status: 'signed',
      signedAt: new Date(),
      signerName: typedName.trim(),
      signerEmail: signerEmail?.trim() || mandate.signerEmail,
      signatureData,
    },
  });

  return NextResponse.json({ data: { signed: true, signedAt: updated.signedAt } });
}
