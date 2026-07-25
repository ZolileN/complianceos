import { NextResponse } from 'next/server';

/**
 * GET/POST /api/whatsapp/webhook — REMOVED
 *
 * Meta Graph API webhooks are no longer supported.
 * Configure Twilio to deliver WhatsApp events to /api/webhooks/twilio.
 */
export async function GET() {
  return NextResponse.json(
    {
      error: 'Gone',
      message: 'Meta WhatsApp webhooks have been removed. Use /api/webhooks/twilio.',
    },
    { status: 410 }
  );
}

export async function POST() {
  console.warn('⚠️ Deprecated Meta webhook POST received. Use /api/webhooks/twilio.');
  return NextResponse.json(
    {
      error: 'Gone',
      message: 'Meta WhatsApp webhooks have been removed. Use /api/webhooks/twilio.',
    },
    { status: 410 }
  );
}
