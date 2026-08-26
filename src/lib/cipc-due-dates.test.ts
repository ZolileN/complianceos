import { describe, expect, it } from 'vitest';

import {
  annualReturnsStatusForDueDate,
  computeAnnualReturnsDueDate,
} from '@/lib/cipc-due-dates';
import {
  INBOUND_QUEUE_REGISTRATION,
  isInboundQueueClient,
  parseDocumentInboundMeta,
} from '@/lib/unassigned-documents';

describe('computeAnnualReturnsDueDate', () => {
  it('returns due date 30 days after registration anniversary', () => {
    const due = computeAnnualReturnsDueDate('15/03/2020', new Date('2026-01-01'));
    expect(due).not.toBeNull();
    expect(due!.getMonth()).toBe(3);
    expect(due!.getDate()).toBe(14);
  });
});

describe('annualReturnsStatusForDueDate', () => {
  it('marks overdue returns as critical', () => {
    const due = new Date('2020-01-30');
    expect(annualReturnsStatusForDueDate(due, new Date('2026-06-01'))).toBe('critical');
  });
});

describe('unassigned documents helpers', () => {
  it('identifies inbound queue client', () => {
    expect(
      isInboundQueueClient({ registrationNumber: INBOUND_QUEUE_REGISTRATION })
    ).toBe(true);
    expect(isInboundQueueClient({ registrationNumber: '2020/123456/07' })).toBe(false);
  });

  it('parses inbound metadata from OCR JSON', () => {
    const meta = parseDocumentInboundMeta(
      JSON.stringify({ inbound_email_id: 'email-1', unassigned: true })
    );
    expect(meta.inboundEmailId).toBe('email-1');
    expect(meta.unassigned).toBe(true);
  });

  it('parses WhatsApp inbound metadata from OCR JSON', () => {
    const meta = parseDocumentInboundMeta(
      JSON.stringify({
        inbound_message_id: 'msg-1',
        sender_phone: '+27821234567',
        source: 'inbound_whatsapp',
        unassigned: true,
      })
    );
    expect(meta.inboundMessageId).toBe('msg-1');
    expect(meta.senderPhone).toBe('+27821234567');
    expect(meta.source).toBe('inbound_whatsapp');
  });
});
