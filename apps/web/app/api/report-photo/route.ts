import 'server-only';

import convert from 'heic-convert';
import sharp from 'sharp';

import { isHeicReportPhoto, isReportCardPhoto } from '@/lib/report-photo';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const MAX_CACHE_SECONDS = 60 * 60;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function errorResponse(status: number, message: string) {
  return Response.json({ error: message }, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const photoPath = searchParams.get('path')?.trim() ?? '';
  const adminCaseId = searchParams.get('caseId')?.trim() ?? '';
  const variant = searchParams.get('variant')?.trim() ?? '';
  const isPublicVariant = variant === 'card' || variant === 'detail';

  if (
    !photoPath ||
    photoPath.length > 1024 ||
    photoPath.startsWith('/') ||
    photoPath.includes('\0') ||
    photoPath.split('/').includes('..') ||
    !(isPublicVariant ? isReportCardPhoto(photoPath) : isHeicReportPhoto(photoPath))
  ) {
    return errorResponse(400, 'Invalid report photo path.');
  }
  if (adminCaseId && !UUID_PATTERN.test(adminCaseId)) {
    return errorResponse(400, 'Invalid administrator case.');
  }
  if (variant && !isPublicVariant) {
    return errorResponse(400, 'Invalid report photo variant.');
  }

  try {
    const now = new Date();
    const supabase = await createClient();
    let expiresAt: string | null = null;

    if (adminCaseId) {
      const { data: detail, error: caseError } = await supabase.rpc(
        'get_cleanup_admin_case',
        { target_case_id: adminCaseId },
      );
      if (caseError) return errorResponse(403, 'Administrator access with MFA is required.');
      const report = (detail as { report?: { photo_paths?: string[] | null } | null } | null)?.report;
      if (!report?.photo_paths?.includes(photoPath)) {
        return errorResponse(404, 'Report photo not found in this case.');
      }
    } else {
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .select('expires_at')
        .eq('is_sample', false)
        .contains('photo_paths', [photoPath])
        .or('status.is.null,status.eq.active')
        .gt('expires_at', now.toISOString())
        .limit(1)
        .maybeSingle();

      if (reportError) return errorResponse(502, 'Report photo could not be verified.');
      if (!report?.expires_at) return errorResponse(404, 'Report photo not found.');
      expiresAt = report.expires_at;
    }

    const { data: source, error: downloadError } = await supabase.storage
      .from('report_photos')
      .download(photoPath);

    if (downloadError || !source) return errorResponse(404, 'Report photo not found.');
    if (source.size > MAX_SOURCE_BYTES) return errorResponse(413, 'Report photo is too large.');

    const sourceBuffer = new Uint8Array(await source.arrayBuffer());
    const browserImage = isHeicReportPhoto(photoPath)
      ? Buffer.from(await convert({
        buffer: sourceBuffer,
        format: 'JPEG',
        quality: 0.82,
      }))
      : Buffer.from(sourceBuffer);
    const deliveredImage = variant === 'card'
      ? await sharp(browserImage)
        .rotate()
        .resize({ width: 720, height: 405, fit: 'cover', position: 'centre', withoutEnlargement: true })
        .webp({ quality: 76 })
        .toBuffer()
      : variant === 'detail'
        ? await sharp(browserImage)
          .rotate()
          .resize({ width: 1600, height: 1200, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer()
        : browserImage;
    const secondsUntilExpiration = expiresAt
      ? Math.floor((new Date(expiresAt).getTime() - now.getTime()) / 1000)
      : 0;
    const cacheSeconds = expiresAt
      ? Math.max(0, Math.min(MAX_CACHE_SECONDS, secondsUntilExpiration))
      : 0;

    return new Response(deliveredImage, {
      status: 200,
      headers: {
        'Cache-Control': adminCaseId
          ? 'private, no-store'
          : `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}`,
        'Content-Type': isPublicVariant ? 'image/webp' : 'image/jpeg',
        'Content-Length': String(deliveredImage.byteLength),
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return errorResponse(500, 'Report photo could not be converted.');
  }
}
