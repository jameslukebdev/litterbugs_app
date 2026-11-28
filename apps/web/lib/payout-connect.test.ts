// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest';
const f = vi.hoisted(() => ({
  auth: { listener: null as null | ((event: string, session: { user: { id: string } } | null) => void) },
  getSession: vi.fn(), createSession: vi.fn(), load: vi.fn(), logout: vi.fn(),
}));
vi.mock('@stripe/connect-js', () => ({ loadConnectAndInitialize: f.load }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: {
  getSession: f.getSession, onAuthStateChange: (listener: typeof f.auth.listener) => { f.auth.listener = listener; },
} }) }));
vi.mock('@/lib/funding', () => ({ createPayoutSession: f.createSession }));
beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  f.getSession.mockResolvedValue({ data: { session: { user: { id: 'member-one' } } } });
  f.load.mockReturnValue({ logout: f.logout }); f.logout.mockResolvedValue(undefined);
  f.createSession.mockResolvedValue({ publishableKey: 'pk_test_fixture', clientSecret: 'fresh-secret', expiresAt: 1900000000 });
});
const session = { publishableKey: 'pk_test_fixture', clientSecret: 'initial-secret', expiresAt: 1900000000 };
it('uses the initial single-use secret once and requests a fresh session when Stripe refreshes it', async () => {
  const { createPayoutConnect } = await import('./payout-connect');
  await createPayoutConnect(session, vi.fn());
  const options = f.load.mock.calls[0][0];
  expect(options.appearance.variables.colorPrimary).toBe('#5146ed');
  expect(await options.fetchClientSecret()).toBe('initial-secret');
  expect(f.createSession).not.toHaveBeenCalled();
  expect(await options.fetchClientSecret()).toBe('fresh-secret');
  expect(f.createSession).toHaveBeenCalledOnce();
});
it('invalidates all sessions on app sign-out and refuses to refresh them', async () => {
  const { createPayoutConnect } = await import('./payout-connect');
  const invalidated = vi.fn();
  await createPayoutConnect(session, invalidated);
  f.auth.listener?.('SIGNED_OUT', null);
  expect(f.logout).toHaveBeenCalledOnce(); expect(invalidated).toHaveBeenCalledOnce();
  await expect(f.load.mock.calls[0][0].fetchClientSecret()).rejects.toThrow('session has ended');
});
it('invalidates the old member session on account change, retaining the same member on sign-in refresh', async () => {
  const { createPayoutConnect } = await import('./payout-connect');
  await createPayoutConnect(session, vi.fn());
  f.auth.listener?.('SIGNED_IN', { user: { id: 'member-one' } });
  expect(f.logout).not.toHaveBeenCalled();
  f.auth.listener?.('SIGNED_IN', { user: { id: 'member-two' } });
  expect(f.logout).toHaveBeenCalledOnce();
});
it('does not create an embedded instance for a missing app session', async () => {
  f.getSession.mockResolvedValue({ data: { session: null } });
  const { createPayoutConnect } = await import('./payout-connect');
  await expect(createPayoutConnect(session, vi.fn())).rejects.toThrow('sign in again');
  expect(f.load).not.toHaveBeenCalled();
});

it('reuses one instance across modal openings without requesting another account session', async () => {
  const { createPayoutConnect, reusePayoutConnect } = await import('./payout-connect');
  const originalCallback = vi.fn(); const currentCallback = vi.fn();
  const instance = await createPayoutConnect(session, originalCallback);
  expect(await reusePayoutConnect(currentCallback)).toBe(instance);
  expect(await createPayoutConnect(session, currentCallback)).toBe(instance);
  expect(f.load).toHaveBeenCalledOnce();
  expect(f.createSession).not.toHaveBeenCalled();
  f.auth.listener?.('SIGNED_OUT', null);
  expect(currentCallback).toHaveBeenCalledOnce();
  expect(originalCallback).not.toHaveBeenCalled();
});

it('does not reuse the previous member’s instance and guards pending setup before an instance exists', async () => {
  const { createPayoutConnect, reusePayoutConnect } = await import('./payout-connect');
  await createPayoutConnect(session, vi.fn());
  f.getSession.mockResolvedValue({ data: { session: { user: { id: 'member-two' } } } });
  const pendingInvalidated = vi.fn();
  expect(await reusePayoutConnect(pendingInvalidated)).toBeNull();
  f.auth.listener?.('SIGNED_OUT', null);
  expect(pendingInvalidated).toHaveBeenCalledOnce();
});

it('refuses reuse without a signed-in member', async () => {
  const { createPayoutConnect, reusePayoutConnect } = await import('./payout-connect');
  await createPayoutConnect(session, vi.fn());
  f.getSession.mockResolvedValue({ data: { session: null } });
  await expect(reusePayoutConnect(vi.fn())).rejects.toThrow('sign in again');
});

it('refreshes an initial secret that expires before Stripe starts using the retained instance', async () => {
  const { createPayoutConnect } = await import('./payout-connect');
  await createPayoutConnect({ ...session, expiresAt: 1 }, vi.fn());
  expect(await f.load.mock.calls[0][0].fetchClientSecret()).toBe('fresh-secret');
  expect(f.createSession).toHaveBeenCalledOnce();
});
