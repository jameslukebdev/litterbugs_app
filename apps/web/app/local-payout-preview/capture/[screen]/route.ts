import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { localPreviewAllowed } from '../../local-only';

export const runtime = 'nodejs';
const screens = ['legal-name', 'bank-selection', 'manual-bank'];
export async function GET(request: Request, { params }: { params: Promise<{ screen: string }> }) {
  if (!localPreviewAllowed(request.headers.get('host'))) return new Response('Not found', { status: 404 });
  const { screen } = await params;
  if (!screens.includes(screen)) return new Response('Not found', { status: 404 });
  for (const base of [process.cwd(), join(process.cwd(), 'apps/web')]) {
    try {
      const bytes = await readFile(join(base, 'work/payout-step-previews', `${screen}.png`));
      return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
    } catch { /* Try the other supported workspace launch directory. */ }
  }
  return new Response('Preview capture unavailable', { status: 404 });
}
