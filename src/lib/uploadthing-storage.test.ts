import { describe, expect, it } from 'vitest';
import {
  collectUploadThingFileKeys,
  extractUploadThingFileKey,
} from './uploadthing-storage';

describe('extractUploadThingFileKey', () => {
  it('extracts key from utfs.io URLs', () => {
    expect(
      extractUploadThingFileKey(
        'https://utfs.io/f/2e0fdb64-9957-4262-8e45-f372ba903ac8_statement.pdf'
      )
    ).toBe('2e0fdb64-9957-4262-8e45-f372ba903ac8_statement.pdf');
  });

  it('extracts key from ufs.sh URLs', () => {
    expect(
      extractUploadThingFileKey(
        'https://abc123.ufs.sh/f/my-file-key.jpg'
      )
    ).toBe('my-file-key.jpg');
  });

  it('returns null for internal API proxy paths', () => {
    expect(
      extractUploadThingFileKey('/api/emails/email-id/attachments/attachment-id')
    ).toBeNull();
    expect(extractUploadThingFileKey('/api/whatsapp/media/media-id')).toBeNull();
  });

  it('returns null for unrelated URLs', () => {
    expect(extractUploadThingFileKey('https://example.com/file.pdf')).toBeNull();
  });
});

describe('collectUploadThingFileKeys', () => {
  it('deduplicates keys across paths', () => {
    const keys = collectUploadThingFileKeys([
      'https://utfs.io/f/shared-key.pdf',
      'https://utfs.io/f/shared-key.pdf',
      '/api/emails/x/attachments/y',
      'https://utfs.io/f/other-key.pdf',
    ]);

    expect(keys).toEqual(['shared-key.pdf', 'other-key.pdf']);
  });
});
