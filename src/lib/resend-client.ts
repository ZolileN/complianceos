import { Resend } from 'resend';

let client: Resend | null = null;

/** Lazy Resend client — avoids build-time failure when RESEND_API_KEY is unset. */
export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

export function requireResend(): Resend {
  const resend = getResend();
  if (!resend) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  return resend;
}
