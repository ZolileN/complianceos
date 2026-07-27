/**
 * Helpers for Resend inbound (receiving) webhooks.
 */

export type ResendReceivedMeta = {
  email_id?: string;
  from?: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  received_for?: string[];
  subject?: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
  attachments?: Array<{
    id?: string;
    filename?: string;
    content_type?: string;
    download_url?: string;
  }>;
};

/** Extract bare email from "Name <user@domain.com>" or return as-is. */
export function normalizeEmailAddress(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/<([^>]+)>/);
  return (match ? match[1] : trimmed).trim().toLowerCase();
}

/** Collect all recipient addresses from webhook metadata. */
export function collectRecipientAddresses(data: ResendReceivedMeta): string[] {
  const all = [
    ...(data.to || []),
    ...(data.received_for || []),
    ...(data.cc || []),
    ...(data.bcc || []),
  ];
  return [...new Set(all.map((a) => a.trim()).filter(Boolean))];
}

/**
 * Parse tenant slug from recipient addresses.
 * Supports configured INBOUND_EMAIL_DOMAIN and free-tier *.resend.app addresses.
 */
export function parseTenantSlugFromRecipients(recipients: string[]): string | null {
  const configuredDomain = process.env.INBOUND_EMAIL_DOMAIN?.trim().toLowerCase();

  for (const addr of recipients) {
    const lower = addr.toLowerCase().trim();
    const at = lower.indexOf('@');
    if (at === -1) continue;
    const local = lower.slice(0, at);
    const host = lower.slice(at + 1);

    if (!local) continue;

    if (configuredDomain && (host === configuredDomain || host.endsWith(`.${configuredDomain}`))) {
      return local;
    }

    // Free Resend receiving address (*.resend.app) — no extra domain config required.
    if (host.endsWith('.resend.app')) {
      return local;
    }
  }

  return null;
}

export type ReceivedEmailContent = {
  text?: string | null;
  html?: string | null;
  headers?: Record<string, string>;
};

/** Fetch body/headers for a received email (webhook metadata only includes subject/from/to). */
export async function fetchReceivedEmailContent(
  emailId: string
): Promise<ReceivedEmailContent | null> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      console.error(`Resend receiving API ${res.status}:`, await res.text().catch(() => ''));
      return null;
    }
    const json = (await res.json()) as {
      text?: string | null;
      html?: string | null;
      headers?: Record<string, string>;
    };
    return {
      text: json.text,
      html: json.html,
      headers: json.headers,
    };
  } catch (error) {
    console.error('Failed to fetch received email content:', error);
    return null;
  }
}

export function inboundEmailDomain(): string | null {
  return (
    process.env.INBOUND_EMAIL_DOMAIN?.trim() ||
    process.env.NEXT_PUBLIC_INBOUND_EMAIL_DOMAIN?.trim() ||
    null
  );
}

export function inboundAddressForTenant(tenantSlug: string): string {
  const domain = inboundEmailDomain();
  if (!domain) return `${tenantSlug}@your-inbound-domain`;
  return `${tenantSlug}@${domain}`;
}

export function inboundAddressHint(): string {
  const domain = inboundEmailDomain();
  if (!domain) return '{tenant-slug}@your-inbound-domain';
  return `{tenant-slug}@${domain}`;
}
