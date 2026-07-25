import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * GET /api/whatsapp/media/[id]
 *
 * Proxies Twilio media downloads for WhatsApp attachments.
 * The [id] path segment is a URL-encoded Twilio MediaUrl.
 * Proxied server-side so Twilio auth credentials stay off the client.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mediaId = (await params).id;
    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID required' }, { status: 400 });
    }

    const decodedUrl = decodeURIComponent(mediaId);
    const isTwilioUrl = decodedUrl.startsWith('http://') || decodedUrl.startsWith('https://');

    if (!isTwilioUrl) {
      return NextResponse.json(
        { error: 'Invalid media reference. Expected a Twilio media URL.' },
        { status: 400 }
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: 'Twilio credentials are not configured' },
        { status: 500 }
      );
    }

    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const response = await fetch(decodedUrl, {
      headers: {
        Authorization: `Basic ${basicAuth}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch media from Twilio' }, { status: 502 });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const buffer = await response.arrayBuffer();

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="download-${Date.now()}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
  }
}
