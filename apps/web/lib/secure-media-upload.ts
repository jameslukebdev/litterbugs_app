'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@litterbugs/report-contract';

const MEDIA_QUARANTINE_BUCKET = 'media_quarantine';
const MEDIA_MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

type SecureMediaInput = {
  supabase: SupabaseClient<Database>;
  userId: string;
  kind: 'report' | 'cleanup' | 'avatar';
  file: File;
  subjectId?: string;
  submissionId?: string;
  position?: number;
};

function normalizeMimeType(value: string) {
  const mimeType = value.toLowerCase();
  return mimeType === 'image/jpg' ? 'image/jpeg' : mimeType;
}

function browserMimeType(file: File) {
  const declared = normalizeMimeType(file.type);
  if (declared) return declared;
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension && MIME_EXTENSIONS[`image/${extension}`]) return `image/${extension}`;
  return '';
}

export async function uploadSecureBrowserMedia(input: SecureMediaInput) {
  const mimeType = browserMimeType(input.file);
  const extension = MIME_EXTENSIONS[mimeType];
  if (!extension) throw new Error('Choose a JPEG, PNG, WebP, HEIC, or HEIF image.');
  if (input.file.size < 1 || input.file.size > MEDIA_MAX_SOURCE_BYTES) {
    throw new Error('Choose an image smaller than 5 MB.');
  }
  const quarantinePath = `${input.userId}/${input.kind}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await input.supabase.storage
    .from(MEDIA_QUARANTINE_BUCKET)
    .upload(quarantinePath, input.file, {
      contentType: mimeType,
      cacheControl: '0',
      upsert: false,
    });
  if (uploadError) throw uploadError;

  try {
    const { data: sessionData, error: sessionError } = await input.supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (sessionError || !accessToken) throw new Error('Sign in again before uploading a photo.');
    const response = await fetch('/api/media/process', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        kind: input.kind,
        quarantinePath,
        ...(input.kind !== 'avatar' ? { subjectId: input.subjectId } : {}),
        ...(input.kind === 'cleanup'
          ? { submissionId: input.submissionId, position: input.position }
          : {}),
      }),
    });
    const payload = await response.json().catch(() => null) as {
      path?: unknown;
      contentType?: unknown;
      error?: { message?: unknown };
    } | null;
    if (!response.ok) {
      const message = typeof payload?.error?.message === 'string'
        ? payload.error.message
        : 'The photo could not be checked. Please try again.';
      throw new Error(message);
    }
    if (typeof payload?.path !== 'string' || payload.contentType !== 'image/jpeg') {
      throw new Error('The photo safety check returned an invalid response.');
    }
    return payload.path;
  } catch (error) {
    await input.supabase.storage.from(MEDIA_QUARANTINE_BUCKET).remove([quarantinePath]);
    throw error;
  }
}
