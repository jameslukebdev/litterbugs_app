import { NextRequest, NextResponse } from 'next/server';
import { readLocalContributorCredits } from '@/lib/server-contributor-credits';

const uuid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const loopback = (hostname: string) => ['localhost', '127.0.0.1', '[::1]'].includes(hostname);

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development' || process.env.VERCEL === '1' || !loopback(request.nextUrl.hostname)) {
    return new Response(null, { status: 404 });
  }
  if (request.headers.get('origin') !== request.nextUrl.origin) return new Response(null, { status: 403 });
  const input = await request.json().catch(() => null);
  const ids = input?.report_ids;
  if (!Array.isArray(ids) || ids.length > 100 || ids.some(id => typeof id !== 'string' || !uuid.test(id))) {
    return new Response(null, { status: 400 });
  }
  try {
    const credits = await readLocalContributorCredits(ids);
    return NextResponse.json(credits, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
