const photos = ['/homepage-photos/walk.webp', '/homepage-photos/cleanup.webp', '/homepage-photos/phone.webp'];
const delays = [180, 1400, 2600];

/** Local-only staggered responses for testing the real photo batching code. */
export async function GET(request: Request) {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 });
  const raw = Number(new URL(request.url).searchParams.get('photo'));
  const index = Number.isInteger(raw) && raw >= 0 && raw < photos.length ? raw : 0;
  await new Promise(resolve => setTimeout(resolve, delays[index]));
  return new Response(null, { status: 307, headers: { Location: new URL(photos[index], request.url).toString(), 'Cache-Control': 'no-store' } });
}
