import 'server-only';

import { createHash } from 'node:crypto';
import { unstable_cache } from 'next/cache';

// Store display copies only. Source uploads have unique, non-overwritten paths;
// neither originals nor authorization decisions belong in this cache.
const REVALIDATE_SECONDS = 7 * 24 * 60 * 60;
const MAX_CACHED_BYTES = 1_400_000; // base64 + JSON must fit the 2 MB Data Cache limit.
const pending = new Map<string, Promise<Buffer>>();

export class PhotoSourceError extends Error {
  constructor(readonly status: 404 | 413, message: string) {
    super(message);
  }
}

/** Call only AFTER this request has verified access to this specific photo. */
export async function loadDisplayPhoto(
  bucket: 'report_photos' | 'cleanup_photos',
  path: string,
  variant: 'card' | 'detail' | 'social-640' | 'social-1080',
  generate: () => Promise<Buffer>,
): Promise<Buffer> {
  const key = createHash('sha256').update(JSON.stringify([
    process.env.NEXT_PUBLIC_SUPABASE_URL, bucket, path, variant,
  ])).digest('hex');
  const existing = pending.get(key);
  if (existing) return existing;

  const request = (async () => {
    let attemptedGeneration = false;
    let generated: Buffer | undefined;
    try {
      const encoded = await unstable_cache(async () => {
        attemptedGeneration = true;
        generated = await generate();
        // An exceptional large display copy can still be served, without a
        // failed cache write breaking the photo or reducing its quality.
        if (generated.length > MAX_CACHED_BYTES) throw new Error('Display photo exceeds cache entry limit.');
        return generated.toString('base64');
      }, ['display-photo-v1', key], { revalidate: REVALIDATE_SECONDS })();
      return Buffer.from(encoded, 'base64');
    } catch (error) {
      if (generated) return generated;
      if (attemptedGeneration) throw error; // Missing/failed sources are never cached or retried here.
      // Cache outages must not take down otherwise accessible photos.
      return generate();
    }
  })();
  pending.set(key, request);
  try {
    return await request;
  } finally {
    pending.delete(key);
  }
}
