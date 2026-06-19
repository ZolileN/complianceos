import { NextRequest, NextResponse } from 'next/server';
import { downloadMedia, getMediaInfo } from '@/lib/whatsapp';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Basic auth check
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mediaId = params.id;
    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID required' }, { status: 400 });
    }

    // Get media info to know the mime type
    const mediaInfo = await getMediaInfo(mediaId);
    
    // Download actual bytes
    const buffer = await downloadMedia(mediaId);

    // Return the file with correct headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mediaInfo.mime_type,
        // Optional: suggest a filename if we want, or just let the browser handle it.
        // We'll use inline to let the browser display images/pdfs natively.
        'Content-Disposition': `inline; filename="download-${mediaId}"`,
      },
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
  }
}
