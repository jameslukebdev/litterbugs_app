import * as Crypto from 'expo-crypto';

import { supabase } from './supabase';

export const MEDIA_QUARANTINE_BUCKET = 'media_quarantine';
export const MEDIA_PROCESSING_URL = 'https://litterbugs.app/api/media/process';
const MEDIA_MAX_SOURCE_BYTES = 5 * 1024 * 1024;

const MIME_EXTENSIONS = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
});

function serverMessage(payload, fallback) {
  const message = payload?.error?.message;
  return typeof message === 'string' && message.trim() ? message.trim() : fallback;
}

export async function uploadSecureMedia({
  userId,
  kind,
  bytes,
  mimeType,
  subjectId,
  submissionId,
  position,
  fetchImpl = fetch,
}) {
  const extension = MIME_EXTENSIONS[mimeType];
  if (!userId || !['report', 'cleanup', 'avatar'].includes(kind) || !extension) {
    throw new Error('The selected photo is not supported.');
  }
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 1 || bytes.byteLength > MEDIA_MAX_SOURCE_BYTES) {
    throw new Error('Choose an image smaller than 5 MB.');
  }
  const quarantinePath = `${userId}/${kind}/${Crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(MEDIA_QUARANTINE_BUCKET)
    .upload(quarantinePath, bytes, {
      contentType: mimeType,
      cacheControl: '0',
      upsert: false,
    });
  if (uploadError) throw uploadError;

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (sessionError || !accessToken) {
      throw new Error('Sign in again before uploading a photo.');
    }
    const body = {
      kind,
      quarantinePath,
      ...(kind !== 'avatar' ? { subjectId } : {}),
      ...(kind === 'cleanup' ? { submissionId, position } : {}),
    };
    const response = await fetchImpl(MEDIA_PROCESSING_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(serverMessage(
        payload,
        'The photo could not be checked. Please try again.',
      ));
    }
    if (typeof payload?.path !== 'string' || payload.contentType !== 'image/jpeg') {
      throw new Error('The photo safety check returned an invalid response.');
    }
    return payload.path;
  } catch (error) {
    await supabase.storage.from(MEDIA_QUARANTINE_BUCKET).remove([quarantinePath]);
    throw error;
  }
}
