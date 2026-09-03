import 'server-only';

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@litterbugs/report-contract';

import { getSupabaseEnv } from '@/lib/env';
import {
  MEDIA_MAX_SOURCE_BYTES,
  MEDIA_SCANNER_MAX_SOURCE_BYTES,
  MEDIA_QUARANTINE_BUCKET,
  MediaSecurityError,
  requireCleanMalwareScan,
  sanitizeImage,
  validateSecureMediaRequest,
  type ValidatedSecureMediaRequest,
} from '@/lib/media-security';

export const runtime = 'nodejs';
export const maxDuration = 30;

function errorResponse(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function bearerToken(request: Request) {
  const authorization = request.headers.get('authorization') ?? '';
  const match = authorization.match(/^Bearer ([^\s]+)$/);
  return match?.[1] ?? null;
}

async function authorizeDestination(
  admin: SupabaseClient<Database>,
  request: ValidatedSecureMediaRequest,
  userId: string,
) {
  if (request.kind === 'avatar') return true;
  if (request.kind === 'report') {
    const { data, error } = await admin
      .from('reports')
      .select('id,user_id,status')
      .eq('id', request.subjectId as string)
      .maybeSingle();
    return !error && data?.user_id === userId && (data.status ?? 'active') === 'active';
  }

  const { data, error } = await admin
    .from('cleanup_attempts')
    .select('id,cleaner_id,status,claim_expires_at,correction_due_at')
    .eq('id', request.subjectId as string)
    .maybeSingle();
  if (error || data?.cleaner_id !== userId) return false;
  const now = Date.now();
  if (data.status === 'claimed') {
    return Boolean(data.claim_expires_at && Date.parse(data.claim_expires_at) > now);
  }
  if (data.status === 'changes_requested') {
    return Boolean(data.correction_due_at && Date.parse(data.correction_due_at) > now);
  }
  return false;
}

export async function POST(request: Request) {
  if (request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    return errorResponse(415, 'MEDIA_INVALID_REQUEST', 'The photo request is invalid.');
  }
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (!Number.isFinite(contentLength) || contentLength > 2048) {
    return errorResponse(413, 'MEDIA_INVALID_REQUEST', 'The photo request is invalid.');
  }
  const token = bearerToken(request);
  if (!token) return errorResponse(401, 'MEDIA_AUTH_REQUIRED', 'Sign in again before uploading a photo.');

  const serviceRoleKey = (
    process.env.SUPABASE_SECRET_KEY
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? ''
  ).trim();
  if (!serviceRoleKey) {
    return errorResponse(503, 'MEDIA_PROCESSOR_UNAVAILABLE', 'Photo safety checking is temporarily unavailable. Please try again shortly.');
  }

  try {
    const { url, publishableKey } = getSupabaseEnv();
    const userClient = createSupabaseClient<Database>(url, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData.user || userData.user.is_anonymous) {
      return errorResponse(401, 'MEDIA_AUTH_REQUIRED', 'Sign in again before uploading a photo.');
    }

    const body = await request.json().catch(() => null);
    const mediaRequest = validateSecureMediaRequest(body, userData.user.id);
    const admin = createSupabaseClient<Database>(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const auditAdmin = createSupabaseClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    if (!await authorizeDestination(admin, mediaRequest, userData.user.id)) {
      return errorResponse(403, 'MEDIA_NOT_ALLOWED', 'This photo can no longer be added.');
    }

    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentCount, error: countError } = await auditAdmin
      .from('media_scan_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userData.user.id)
      .gte('created_at', cutoff);
    if (countError) {
      return errorResponse(503, 'MEDIA_PROCESSOR_UNAVAILABLE', 'Photo safety checking is temporarily unavailable. Please try again shortly.');
    }
    if ((recentCount ?? 0) >= 30) {
      return errorResponse(429, 'MEDIA_RATE_LIMITED', 'Too many photos were checked recently. Please try again later.');
    }
    const { data: scanAttempt, error: attemptError } = await auditAdmin
      .from('media_scan_attempts')
      .insert({
        user_id: userData.user.id,
        quarantine_path: mediaRequest.quarantinePath,
        media_kind: mediaRequest.kind,
      })
      .select('id')
      .single();
    if (attemptError || !scanAttempt?.id) {
      const replay = (attemptError as { code?: string } | null)?.code === '23505';
      const rateLimited = (attemptError as { code?: string; message?: string } | null)?.code === 'P0001'
        && /media scan hourly limit reached/i.test(
          (attemptError as { message?: string } | null)?.message ?? '',
        );
      return errorResponse(
        replay ? 409 : rateLimited ? 429 : 503,
        replay
          ? 'MEDIA_ALREADY_PROCESSED'
          : rateLimited
            ? 'MEDIA_RATE_LIMITED'
            : 'MEDIA_PROCESSOR_UNAVAILABLE',
        replay
          ? 'This photo has already been checked. Choose it again to retry.'
          : rateLimited
            ? 'Too many photos were checked recently. Please try again later.'
          : 'Photo safety checking is temporarily unavailable. Please try again shortly.',
      );
    }
    const finishAttempt = async (outcome: string) => {
      await auditAdmin
        .from('media_scan_attempts')
        .update({ outcome, completed_at: new Date().toISOString() })
        .eq('id', scanAttempt.id);
    };

    const { data: source, error: sourceError } = await admin.storage
      .from(MEDIA_QUARANTINE_BUCKET)
      .download(mediaRequest.quarantinePath);
    if (sourceError || !source || source.size < 1 || source.size > MEDIA_MAX_SOURCE_BYTES) {
      if (source) {
        await admin.storage.from(MEDIA_QUARANTINE_BUCKET).remove([mediaRequest.quarantinePath]);
      }
      await finishAttempt('invalid');
      return errorResponse(422, 'MEDIA_INVALID_IMAGE', 'Choose a supported image smaller than 5 MB.');
    }
    const sourceBytes = new Uint8Array(await source.arrayBuffer());
    const sourceMimeType = source.type.toLowerCase();

    if (sourceBytes.length > MEDIA_SCANNER_MAX_SOURCE_BYTES) {
      await admin.storage.from(MEDIA_QUARANTINE_BUCKET).remove([mediaRequest.quarantinePath]);
      await finishAttempt('too_large');
      return errorResponse(
        413,
        'MEDIA_SCAN_TOO_LARGE',
        'This photo is too large for safety checking. Choose a smaller image.',
      );
    }

    try {
      await requireCleanMalwareScan(sourceBytes, sourceMimeType);
      const sanitized = await sanitizeImage(sourceBytes, sourceMimeType);
      const { error: uploadError } = await admin.storage
        .from(mediaRequest.destinationBucket)
        .upload(mediaRequest.destinationPath, sanitized.bytes, {
          contentType: sanitized.contentType,
          cacheControl: '3600',
          upsert: mediaRequest.kind === 'avatar',
        });
      if (uploadError) {
        await admin.storage.from(MEDIA_QUARANTINE_BUCKET).remove([mediaRequest.quarantinePath]);
        await finishAttempt('storage_error');
        return errorResponse(502, 'MEDIA_STORAGE_ERROR', 'The checked photo could not be saved. Please try again.');
      }
      await admin.storage.from(MEDIA_QUARANTINE_BUCKET).remove([mediaRequest.quarantinePath]);
      await finishAttempt('clean');
      return Response.json({
        path: mediaRequest.destinationPath,
        contentType: sanitized.contentType,
        byteSize: sanitized.bytes.length,
        sha256: sanitized.sha256,
      }, {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    } catch (error) {
      await admin.storage.from(MEDIA_QUARANTINE_BUCKET).remove([mediaRequest.quarantinePath]);
      await finishAttempt(
        error instanceof MediaSecurityError && error.code === 'MEDIA_SCAN_INFECTED'
          ? 'infected'
          : error instanceof MediaSecurityError && error.code === 'MEDIA_INVALID_IMAGE'
            ? 'invalid'
            : 'unavailable',
      );
      throw error;
    }
  } catch (error) {
    if (error instanceof MediaSecurityError) {
      return errorResponse(error.status, error.code, error.message);
    }
    return errorResponse(500, 'MEDIA_PROCESSING_FAILED', 'The photo could not be checked. Please try again.');
  }
}
