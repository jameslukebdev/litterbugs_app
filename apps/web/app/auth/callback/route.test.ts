import { beforeEach, expect, it, vi } from 'vitest';
import { GET } from './route';
const exchange = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { exchangeCodeForSession: exchange } }) }));
beforeEach(() => { vi.resetAllMocks(); exchange.mockResolvedValue({ error: null }); });
it.each(['/report?report_lat=36.123&report_lng=-81.456#map=36,-81,14', '/map?report=private&intent=fund', '/map?report=private&intent=clean'])('preserves %s after actual code exchange and adds a bounded result', async next => {
  const response = await GET(new Request(`https://litterbugs.app/auth/callback?code=secret&next=${encodeURIComponent(next)}`));
  const destination = new URL(response.headers.get('location')!);
  const intended = new URL(next, 'https://litterbugs.app');
  expect(destination.pathname).toBe(intended.pathname);
  expect(destination.hash).toBe(intended.hash);
  for (const [key, value] of intended.searchParams) expect(destination.searchParams.get(key)).toBe(value);
  expect(destination.searchParams.get('participation_auth')).toBe(`${intended.pathname === '/report' ? 'report' : intended.searchParams.get('intent')}:success`);
  expect(destination.searchParams.has('code')).toBe(false);
});
it.each(['returned', 'thrown', 'missing'])('records a %s callback failure without a success signal', async mode => {
  if (mode === 'returned') exchange.mockResolvedValue({ error: new Error('private auth error') });
  if (mode === 'thrown') exchange.mockRejectedValue(new Error('private auth error'));
  const response = await GET(new Request(`https://litterbugs.app/auth/callback?${mode === 'missing' ? '' : 'code=secret&'}next=${encodeURIComponent('/map?report=private&intent=clean')}`));
  const destination = new URL(response.headers.get('location')!);
  expect(destination.pathname).toBe('/');
  expect(destination.searchParams.get('participation_auth')).toBe('clean:failed');
  expect(destination.href).not.toMatch(/secret|private/);
});
it('keeps general account sign-in uninstrumented and blocks external return paths', async () => {
  const general = await GET(new Request('https://litterbugs.app/auth/callback?code=secret&next=/account'));
  expect(general.headers.get('location')).toBe('https://litterbugs.app/account');
  const external = await GET(new Request('https://litterbugs.app/auth/callback?code=secret&next=https://example.com/report'));
  expect(new URL(external.headers.get('location')!).origin).toBe('https://litterbugs.app');
});
