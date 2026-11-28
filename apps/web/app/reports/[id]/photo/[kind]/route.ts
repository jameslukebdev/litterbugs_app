import { loadPublicReportPhoto } from '@/lib/public-report-share';

export const runtime = 'nodejs';
// GET remains request-time and never enters a shared cache: every request rechecks
// current visibility, with the separate server-side display-photo Data Cache behind it.
// A served photo may be reused by that same browser for five minutes, so moving between
// a listing and a report does not download it again; errors are never stored.

const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };

export async function GET(request: Request, { params }: { params: Promise<{ id: string; kind: string }> }) {
  const { id, kind } = await params;
  if (kind !== 'before' && kind !== 'after') return new Response('Photo not found', { status: 404, headers });

  try {
    const search = new URL(request.url).searchParams;
    // ?photo=N picks one of the report's photos (cards page through them); the same visibility checks apply.
    const index = search.has('photo') ? Number(search.get('photo')) : 0;
    const photo = await loadPublicReportPhoto(id, kind, search.get('width') === '640' ? 640 : 1080, index);
    if (!photo) return new Response('Photo not found', { status: 404, headers });

    return new Response(new Uint8Array(photo), {
      headers: { ...headers, 'Cache-Control': 'private, max-age=300', 'Content-Type': 'image/jpeg', 'Content-Length': String(photo.byteLength) },
    });
  } catch {
    return new Response('Photo unavailable', { status: 503, headers });
  }
}
