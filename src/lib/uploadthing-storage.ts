import { UTApi } from 'uploadthing/server';

const UPLOADTHING_URL_PATTERN =
  /^(?:https?:\/\/)?(?:[\w-]+\.)?(?:utfs\.io|ufs\.sh|uploadthing\.com)\/f\/([^/?#]+)/i;

/**
 * Extract an UploadThing file key from a stored file path or public URL.
 * Returns null for internal proxy paths (email/WhatsApp) and non-UploadThing URLs.
 */
export function extractUploadThingFileKey(filePath: string): string | null {
  if (!filePath || filePath.startsWith('/api/')) return null;

  const match = filePath.match(UPLOADTHING_URL_PATTERN);
  if (!match?.[1]) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function collectUploadThingFileKeys(filePaths: string[]): string[] {
  const keys = new Set<string>();
  for (const filePath of filePaths) {
    const key = extractUploadThingFileKey(filePath);
    if (key) keys.add(key);
  }
  return Array.from(keys);
}

let utapi: UTApi | null = null;

function getUtApi(): UTApi {
  if (!utapi) utapi = new UTApi();
  return utapi;
}

/**
 * Delete files from UploadThing storage. Non-UploadThing paths are ignored.
 * Failures are logged but do not throw, so database cleanup can still proceed.
 */
export async function deleteUploadThingFiles(filePaths: string[]): Promise<void> {
  const keys = collectUploadThingFileKeys(filePaths);
  if (keys.length === 0) return;

  try {
    const result = await getUtApi().deleteFiles(keys);
    if (!result.success) {
      console.warn('[UploadThing] deleteFiles returned unsuccessful result', {
        keys,
        deletedCount: result.deletedCount,
      });
    }
  } catch (err) {
    console.error('[UploadThing] Failed to delete files from storage:', err);
  }
}
