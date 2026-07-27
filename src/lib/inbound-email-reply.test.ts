import { describe, expect, it } from 'vitest';
import { formatMessageId, replySubject } from '@/lib/inbound-email-reply';

describe('inbound-email-reply helpers', () => {
  it('prefixes Re: on subjects', () => {
    expect(replySubject('Hello Mintry')).toBe('Re: Hello Mintry');
    expect(replySubject('Re: Hello Mintry')).toBe('Re: Hello Mintry');
  });

  it('formats message ids with angle brackets', () => {
    expect(formatMessageId('abc@mail.gmail.com')).toBe('<abc@mail.gmail.com>');
    expect(formatMessageId('<abc@mail.gmail.com>')).toBe('<abc@mail.gmail.com>');
    expect(formatMessageId(null)).toBeUndefined();
  });
});
