import { loadPublicReportPhoto } from '@/lib/public-report-share';

export const runtime = 'nodejs';
// GET remains request-time (and private/no-store), but must allow the separate
// server-side display-photo Data Cache after current visibility is checked.

const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };

export async function GET(request: Request, { params }: { params: Promise<{ id: string; kind: string }> }) {
  const { id, kind } = await params;
  if (kind !== 'before' && kind !== 'after') return new Response('Photo not found', { status: 404, headers });

  try {
    const photo = await loadPublicReportPhoto(id, kind, new URL(request.url).searchParams.get('width') === '640' ? 640 : 1080);
    if (!photo) return new Response('Photo not found', { status: 404, headers });

    return new Response(new Uint8Array(photo), {
      headers: { ...headers, 'Content-Type': 'image/jpeg', 'Content-Length': String(photo.byteLength) },
    });
  } catch {
    return new Response('Photo unavailable', { status: 503, headers });
  }
}
