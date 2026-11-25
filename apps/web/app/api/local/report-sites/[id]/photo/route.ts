import { NextRequest } from 'next/server';
import { isLocalSiteReport, readLocalSitePhoto } from '@/lib/local-report-sites';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isLocalSiteReport(id) || !['localhost', '127.0.0.1', '[::1]'].includes(request.nextUrl.hostname)
    || request.headers.get('host') !== request.nextUrl.host) return new Response(null, { status: 404 });
  const index = Number(request.nextUrl.searchParams.get('photo') || 0);
  if (!Number.isInteger(index) || index < 0 || index > 2) return new Response(null, { status: 404 });
  const photo = await readLocalSitePhoto(id, index);
  if (!photo?.startsWith('data:image/jpeg;base64,')) return new Response(null, { status: 404 });
  return new Response(Buffer.from(photo.split(',')[1], 'base64'), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
