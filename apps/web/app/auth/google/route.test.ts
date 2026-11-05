import { beforeEach, expect, it, vi } from 'vitest';
const { signInWithOAuth, createClient } = vi.hoisted(() => ({ signInWithOAuth: vi.fn(), createClient: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient }));
import { GET } from './route';
beforeEach(() => {
  vi.resetAllMocks();
  createClient.mockResolvedValue({ auth: { signInWithOAuth } });
  signInWithOAuth.mockResolvedValue({ data: { url: 'https://auth.example/authorize?provider=google' }, error: null });
});
it('starts PKCE in the destination browser and preserves the return destination', async () => {
  const next = '/map?report=abc&intent=fund#map=36,-81,12';
  const response = await GET(new Request(`https://litterbugs.app/auth/google?next=${encodeURIComponent(next)}`));
  expect(response.status).toBe(303);
  expect(response.headers.get('location')).toBe('https://auth.example/authorize?provider=google');
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: {
    redirectTo: `https://litterbugs.app/auth/callback?next=${encodeURIComponent(next)}`, skipBrowserRedirect: true,
  } });
});
it('does not create PKCE or loop if the link remains in Instagram', async () => {
  const response = await GET(new Request('https://litterbugs.app/auth/google?next=%2Faccount', { headers: { 'user-agent': 'iPhone Instagram' } }));
  expect(createClient).not.toHaveBeenCalled();
  expect(new URL(response.headers.get('location')!).searchParams.get('google')).toBe('browser');
});
it.each(['returned', 'thrown', 'missing'])('provides a retry after %s startup failure', async failure => {
  if (failure === 'thrown') createClient.mockRejectedValue(new Error('offline'));
  else signInWithOAuth.mockResolvedValue({ data: { url: null }, error: failure === 'returned' ? new Error('failed') : null });
  const response = await GET(new Request('https://litterbugs.app/auth/google?next=%2Faccount'));
  const fallback = new URL(response.headers.get('location')!);
  expect(fallback.pathname).toBe('/sign-in');
  expect(fallback.searchParams.get('google')).toBe('retry');
  expect(fallback.searchParams.get('next')).toBe('/account');
});
