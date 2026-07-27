import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchReceivedAttachmentDownloadUrl } from '@/lib/inbound-email';
import { isRbacResponse, requireStaff, requireTenantSession } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string; attachmentId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const user = await requireTenantSession();
  if (isRbacResponse(user)) return user;
  const forbidden = requireStaff(user);
  if (forbidden) return forbidden;

  const { id, attachmentId } = await context.params;
  const download = request.nextUrl.searchParams.get('download') === '1';

  try {
    const email = await prisma.inboundEmail.findFirst({
      where: { id, tenantId: user.tenantId! },
      select: { messageId: true },
    });

    if (!email?.messageId) {
      return NextResponse.json({ error: 'Email or attachment not found' }, { status: 404 });
    }

    const attachment = await fetchReceivedAttachmentDownloadUrl(email.messageId, attachmentId);
    if (!attachment) {
      return NextResponse.json({ error: 'Attachment unavailable' }, { status: 404 });
    }

    const fileRes = await fetch(attachment.downloadUrl);
    if (!fileRes.ok) {
      return NextResponse.json({ error: 'Failed to download attachment' }, { status: 502 });
    }

    const buffer = await fileRes.arrayBuffer();
    const disposition = download ? 'attachment' : 'inline';
    const safeName = attachment.filename.replace(/[^\w.\-() ]+/g, '_');

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': attachment.contentType,
        'Content-Disposition': `${disposition}; filename="${safeName}"`,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error: unknown) {
    console.error('GET email attachment error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load attachment' },
      { status: 500 }
    );
  }
}
