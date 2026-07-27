import { describe, expect, it, afterEach } from 'vitest';
import {
  collectRecipientAddresses,
  inboundAddressForTenant,
  normalizeEmailAddress,
  parseTenantSlugFromRecipients,
} from '@/lib/inbound-email';

describe('inbound-email helpers', () => {
  const originalDomain = process.env.INBOUND_EMAIL_DOMAIN;

  afterEach(() => {
    if (originalDomain === undefined) delete process.env.INBOUND_EMAIL_DOMAIN;
    else process.env.INBOUND_EMAIL_DOMAIN = originalDomain;
  });

  it('normalizes display-name addresses', () => {
    expect(normalizeEmailAddress('Zolile <zolile@example.com>')).toBe('zolile@example.com');
  });

  it('parses slug from resend.app without configured domain', () => {
    delete process.env.INBOUND_EMAIL_DOMAIN;
    expect(
      parseTenantSlugFromRecipients(['mlk-computer-consulting@soleiistau.resend.app'])
    ).toBe('mlk-computer-consulting');
  });

  it('builds inbound address for tenant slug', () => {
    process.env.INBOUND_EMAIL_DOMAIN = 'soleiistau.resend.app';
    expect(inboundAddressForTenant('mlk-computer-consulting')).toBe(
      'mlk-computer-consulting@soleiistau.resend.app'
    );
  });

  it('collects received_for addresses', () => {
    const addrs = collectRecipientAddresses({
      to: [],
      received_for: ['apex@soleiistau.resend.app'],
    });
    expect(addrs).toEqual(['apex@soleiistau.resend.app']);
  });
});
