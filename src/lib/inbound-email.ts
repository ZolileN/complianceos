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
  attachments?: InboundEmailAttachmentMeta[];
};

export type InboundEmailAttachmentMeta = {
  id: string;
  name: string;
  contentType: string;
  size?: number;
};

export function parseStoredAttachments(raw: string | null | undefined): InboundEmailAttachmentMeta[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Array<{
      id?: string;
      name?: string;
      filename?: string;
      contentType?: string;
      content_type?: string;
      size?: number;
    }>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item.id)
      .map((item) => ({
        id: item.id!,
        name: item.name || item.filename || 'attachment',
        contentType: item.contentType || item.content_type || 'application/octet-stream',
        size: item.size,
      }));
  } catch {
    return [];
  }
}

export function mergeAttachmentLists(
  stored: InboundEmailAttachmentMeta[],
  fresh: InboundEmailAttachmentMeta[]
): InboundEmailAttachmentMeta[] {
  const byId = new Map<string, InboundEmailAttachmentMeta>();
  for (const item of stored) byId.set(item.id, item);
  for (const item of fresh) {
    const existing = byId.get(item.id);
    byId.set(item.id, {
      id: item.id,
      name: item.name || existing?.name || 'attachment',
      contentType: item.contentType || existing?.contentType || 'application/octet-stream',
      size: item.size ?? existing?.size,
    });
  }
  return [...byId.values()];
}

/** Fetch attachments for a received email (webhook only includes metadata). */
export async function fetchReceivedEmailAttachments(
  emailId: string
): Promise<InboundEmailAttachmentMeta[]> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return [];

  try {
    const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}/attachments`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      console.error(`Resend attachments API ${res.status}:`, await res.text().catch(() => ''));
      return [];
    }
    const json = (await res.json()) as {
      data?: Array<{
        id?: string;
        filename?: string;
        content_type?: string;
        size?: number;
      }>;
    };
    return (json.data || [])
      .filter((item) => item.id)
      .map((item) => ({
        id: item.id!,
        name: item.filename || 'attachment',
        contentType: item.content_type || 'application/octet-stream',
        size: item.size,
      }));
  } catch (error) {
    console.error('Failed to fetch received email attachments:', error);
    return [];
  }
}

/** Fetch a single attachment download URL (valid ~1 hour). */
export async function fetchReceivedAttachmentDownloadUrl(
  emailId: string,
  attachmentId: string
): Promise<{ downloadUrl: string; filename: string; contentType: string } | null> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://api.resend.com/emails/receiving/${emailId}/attachments/${attachmentId}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    if (!res.ok) {
      console.error(`Resend attachment API ${res.status}:`, await res.text().catch(() => ''));
      return null;
    }
    const json = (await res.json()) as {
      download_url?: string;
      filename?: string;
      content_type?: string;
    };
    if (!json.download_url) return null;
    return {
      downloadUrl: json.download_url,
      filename: json.filename || 'attachment',
      contentType: json.content_type || 'application/octet-stream',
    };
  } catch (error) {
    console.error('Failed to fetch received attachment:', error);
    return null;
  }
}

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
      attachments?: Array<{
        id?: string;
        filename?: string;
        content_type?: string;
        size?: number;
      }>;
    };
    const attachments = (json.attachments || [])
      .filter((item) => item.id)
      .map((item) => ({
        id: item.id!,
        name: item.filename || 'attachment',
        contentType: item.content_type || 'application/octet-stream',
        size: item.size,
      }));

    return {
      text: json.text,
      html: json.html,
      headers: json.headers,
      attachments,
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
