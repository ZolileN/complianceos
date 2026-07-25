/* ============================================================
   PraxisOne — Twilio WhatsApp Integration Utilities
   ============================================================ */

import twilio from 'twilio';

// ── Twilio Client Singleton ──

let _client: ReturnType<typeof twilio> | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} environment variable.`);
  }
  return value;
}

export function getTwilioClient() {
  if (!_client) {
    const accountSid = requireEnv('TWILIO_ACCOUNT_SID');
    const authToken = requireEnv('TWILIO_AUTH_TOKEN');
    _client = twilio(accountSid, authToken);
  }
  return _client;
}

// ── Send WhatsApp Message ──

interface SendResult {
  sid: string;
  status: string;
}

export async function sendWhatsAppMessage(
  to: string,
  body: string,
  fromNumber?: string
): Promise<SendResult> {
  const client = getTwilioClient();
  const from = fromNumber || requireEnv('TWILIO_WHATSAPP_NUMBER');

  // Ensure 'whatsapp:' prefix on both from and to
  const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  const formattedFrom = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;

  const message = await client.messages.create({
    from: formattedFrom,
    to: formattedTo,
    body,
  });

  return {
    sid: message.sid,
    status: message.status,
  };
}

// ── Validate Twilio Webhook Signature ──

/**
 * Validates that an incoming webhook request genuinely came from Twilio.
 * Uses the X-Twilio-Signature header and Twilio's request validation.
 */
export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken || !signature) return false;
  return twilio.validateRequest(authToken, signature, url, params);
}

// ── Phone Number Helpers ──

/**
 * Strips the "whatsapp:" prefix from a Twilio WhatsApp number.
 * e.g. "whatsapp:+27825319901" → "+27825319901"
 */
export function stripWhatsAppPrefix(number: string): string {
  return number.replace(/^whatsapp:/, '');
}

/**
 * Normalise a South African phone number to E.164 format.
 * "0825319901" → "+27825319901"
 * "27825319901" → "+27825319901"
 * "+27825319901" → "+27825319901"
 */
export function normaliseToE164(phone: string): string {
  let cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = `+27${cleaned.substring(1)}`;
  } else if (cleaned.startsWith('27') && !cleaned.startsWith('+')) {
    cleaned = `+${cleaned}`;
  } else if (!cleaned.startsWith('+')) {
    cleaned = `+${cleaned}`;
  }
  return cleaned;
}

// ── Twilio Verify (OTP) ──

/**
 * Send an OTP verification code via Twilio Verify to a WhatsApp number.
 */
export async function sendVerificationCode(phoneNumber: string): Promise<string> {
  const client = getTwilioClient();
  const serviceSid = requireEnv('TWILIO_VERIFY_SERVICE_SID');

  const verification = await client.verify.v2
    .services(serviceSid)
    .verifications.create({
      to: phoneNumber,
      channel: 'sms', // Use SMS for verification (WhatsApp channel requires approval)
    });

  return verification.status; // "pending"
}

/**
 * Check a submitted OTP code against Twilio Verify.
 */
export async function checkVerificationCode(
  phoneNumber: string,
  code: string
): Promise<{ valid: boolean; status: string }> {
  const client = getTwilioClient();
  const serviceSid = requireEnv('TWILIO_VERIFY_SERVICE_SID');

  const check = await client.verify.v2
    .services(serviceSid)
    .verificationChecks.create({
      to: phoneNumber,
      code,
    });

  return {
    valid: check.status === 'approved',
    status: check.status,
  };
}
