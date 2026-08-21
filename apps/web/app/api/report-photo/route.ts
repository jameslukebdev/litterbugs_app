import 'server-only';

import convert from 'heic-convert';

import { isHeicReportPhoto } from '@/lib/report-photo';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const MAX_CACHE_SECONDS = 60 * 60;

function errorResponse(status: number, message: string) {
  return Response.json({ error: message }, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function GET(request: Request) {
  const photoPath = new URL(request.url).searchParams.get('path')?.trim() ?? '';

  if (
    !photoPath ||
    photoPath.length > 1024 ||
    photoPath.startsWith('/') ||
    photoPath.includes('\0') ||
    photoPath.split('/').includes('..') ||
    !isHeicReportPhoto(photoPath)
  ) {
    return errorResponse(400, 'Invalid report photo path.');
  }

  try {
    const now = new Date();
    const supabase = await createClient();
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('expires_at')
      .contains('photo_paths', [photoPath])
      .or('status.is.null,status.eq.active')
      .gt('expires_at', now.toISOString())
      .limit(1)
      .maybeSingle();

    if (reportError) return errorResponse(502, 'Report photo could not be verified.');
    if (!report?.expires_at) return errorResponse(404, 'Report photo not found.');

    const { data: source, error: downloadError } = await supabase.storage
      .from('report_photos')
      .download(photoPath);

    if (downloadError || !source) return errorResponse(404, 'Report photo not found.');
    if (source.size > MAX_SOURCE_BYTES) return errorResponse(413, 'Report photo is too large.');

    const jpeg = await convert({
      buffer: new Uint8Array(await source.arrayBuffer()),
      format: 'JPEG',
      quality: 0.82,
    });
    const secondsUntilExpiration = Math.floor(
      (new Date(report.expires_at).getTime() - now.getTime()) / 1000,
    );
    const cacheSeconds = Math.max(0, Math.min(MAX_CACHE_SECONDS, secondsUntilExpiration));

    return new Response(Buffer.from(jpeg), {
      status: 200,
      headers: {
        'Cache-Control': `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}`,
        'Content-Type': 'image/jpeg',
        'Content-Length': String(jpeg.byteLength),
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return errorResponse(500, 'Report photo could not be converted.');
  }
}
