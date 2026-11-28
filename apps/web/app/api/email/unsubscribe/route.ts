import { createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { normalizeWeeklyEmail, type Database } from '@litterbugs/report-contract';
import { getSiteUrl, getSupabaseEnv } from '@/lib/env';

export const runtime = 'nodejs';
const reply = (status: number) => Response.json({ ok: status === 200 }, { status, headers: { 'Cache-Control': 'no-store', ...(status === 429 ? { 'Retry-After': '3600' } : {}) } });

export async function POST(request: Request) {
  // GET never changes preferences, so link scanners cannot unsubscribe people.
  const origin = request.headers.get('origin');
  // A reverse proxy may give Next an internal request URL. Trust the configured
  // public site origin, rather than the proxy's internal host or forwarded input.
  let siteOrigin: string;
  try { siteOrigin = getSiteUrl(); } catch { return reply(503); }
  if (!origin || origin !== siteOrigin || request.headers.get('sec-fetch-site') === 'cross-site') return reply(403);
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return reply(415);
  if (Number(request.headers.get('content-length') ?? 0) > 2048) return reply(413);
  let body;
  try {
    // Bound the actual body, including chunked requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return reply(400);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 2048) { await reader.cancel(); return reply(413); }
      chunks.push(value);
    }
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch { return reply(400); }
  const email = normalizeWeeklyEmail(body?.email);
  if (!email) return reply(400);
  if (body.website) return reply(200); // Bot trap; does not mutate subscription data.
  const secret = (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (!secret) return reply(503);
  try {
    const { url } = getSupabaseEnv();
    const client = createClient<Database>(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    const ip = request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for') ?? 'unknown';
    const requestKey = createHmac('sha256', secret).update(ip.split(',')[0].trim().slice(0,128)).digest('hex');
    const { error } = await client.rpc('unsubscribe_weekly_email', { target_email: email, target_request_key: requestKey });
    // Never return whether an account exists, its email, or backend error details.
    if (error) return reply(error.code === 'P0001' ? 429 : 503);
    return reply(200);
  } catch { return reply(503); }
}
