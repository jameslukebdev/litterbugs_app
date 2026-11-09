import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { localPreviewAllowed } from '../../local-only';
import { captures } from '../../captures';

export const runtime = 'nodejs';
export async function GET(request: Request, { params }: { params: Promise<{ screen: string }> }) {
  if (!localPreviewAllowed(request.headers.get('host'))) return new Response('Not found', { status: 404 });
  const { screen } = await params;
  if (!Object.hasOwn(captures, screen)) return new Response('Not found', { status: 404 });
  for (const base of [process.cwd(), join(process.cwd(), 'apps/web')]) {
    try {
      const bytes = await readFile(join(base, 'work/payout-step-previews', `${screen}.jpg`));
      return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    } catch { /* Try the other supported workspace launch directory. */ }
  }
  return new Response('Preview capture unavailable', { status: 404 });
}
