import { beforeEach, expect, it, vi } from 'vitest';
import { localPayoutSession } from './local-payout-session';
import type { createClient } from '@/lib/supabase/server';

const env = { NODE_ENV: 'development', LITTERBUGS_LOCAL_STRIPE_SECRET_KEY: 'rk_live_fixture',
  LITTERBUGS_LOCAL_STRIPE_PUBLISHABLE_KEY: 'pk_live_fixture' } as NodeJS.ProcessEnv;
let account: { stripe_account_id: string; age_18_confirmed_at: string } | null;
const auth = vi.fn(); const flag = vi.fn(); const invoke = vi.fn(); const eq = vi.fn();
const network = vi.fn();
const client = { auth: { getUser: auth }, functions: { invoke }, from: (name: string) => ({ select: () => ({
  eq: (column: string, value: string) => {
    eq(name, column, value);
    return { single: flag, maybeSingle: async () => ({ data: account, error: null }) };
  },
}) }) };
const deps = () => ({ env, createClient: (async () => client) as unknown as typeof createClient, fetch: network as typeof fetch });
const request = (body = { confirmAge18: true, account: 'acct_ATTACKER' }, origin = 'http://localhost:3000', host = 'localhost:3000') => new Request('http://localhost:3000/api/local/payout-session', {
  method: 'POST', headers: { origin, host, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
beforeEach(() => {
  vi.resetAllMocks();
  account = { stripe_account_id: 'acct_MEMBER', age_18_confirmed_at: '2026-11-07T00:00:00Z' };
  auth.mockResolvedValue({ data: { user: { id: 'signed-in-member' } }, error: null });
  flag.mockResolvedValue({ data: { enabled: true }, error: null });
  network.mockImplementation(async (url: string) => Response.json(url.endsWith('/account') ? { id: 'acct_1U2HZe40KMkUKMFW' }
    : url.endsWith('/account_sessions') ? { client_secret: 'session_secret', expires_at: 1900000000 }
    : { business_type: 'individual', business_profile: { product_description: 'Existing activity' }, requirements: {} }));
});
it('only returns an onboarding session for the authenticated member’s RLS account', async () => {
  const response = await localPayoutSession(request(), deps());
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(await response.json()).toEqual({ clientSecret: 'session_secret', publishableKey: 'pk_live_fixture', expiresAt: 1900000000 });
  expect(eq).toHaveBeenCalledWith('cleaner_payout_accounts', 'user_id', 'signed-in-member');
  const [url, options] = network.mock.calls.at(-1)!;
  expect(url).toBe('https://api.stripe.com/v1/account_sessions');
  expect(Object.fromEntries(options.body)).toEqual({ account: 'acct_MEMBER',
    'components[account_onboarding][enabled]': 'true',
    'components[account_onboarding][features][external_account_collection]': 'true',
    'components[account_onboarding][features][disable_stripe_user_authentication]': 'false' });
  expect(invoke).not.toHaveBeenCalled();
});
it('is inaccessible in production, on a deployment, from another origin or with a foreign host', async () => {
  for (const testEnv of [{ ...env, NODE_ENV: 'production' as const }, { ...env, VERCEL: '1' }]) {
    expect((await localPayoutSession(request(), { ...deps(), env: testEnv })).status).toBe(404);
  }
  expect((await localPayoutSession(request(undefined, 'https://attacker.example'), deps())).status).toBe(403);
  expect((await localPayoutSession(request(undefined, undefined, 'attacker.example'), deps())).status).toBe(404);
  expect(auth).not.toHaveBeenCalled(); expect(network).not.toHaveBeenCalled();
});
it('fails closed with missing keys, signed-out/anonymous users, disabled payouts and missing eligibility', async () => {
  expect((await localPayoutSession(request(), { ...deps(), env: { NODE_ENV: 'development' } })).status).toBe(503);
  for (const user of [null, { id: 'anonymous', is_anonymous: true }]) {
    auth.mockResolvedValue({ data: { user }, error: null });
    expect((await localPayoutSession(request(), deps())).status).toBe(401);
  }
  auth.mockResolvedValue({ data: { user: { id: 'member' } }, error: null });
  expect((await localPayoutSession(request({ confirmAge18: false, account: '' }), deps())).status).toBe(400);
  flag.mockResolvedValue({ data: { enabled: false }, error: null });
  expect((await localPayoutSession(request(), deps())).status).toBe(409);
  expect(network).not.toHaveBeenCalled();
});
it('uses the existing authenticated service for first-time eligibility without redirecting', async () => {
  account = null;
  invoke.mockImplementation(async () => {
    account = { stripe_account_id: 'acct_MEMBER', age_18_confirmed_at: 'confirmed' };
    return { data: { url: 'https://connect.stripe.com/unused' } };
  });
  expect((await localPayoutSession(request(), deps())).status).toBe(200);
  expect(invoke).toHaveBeenCalledWith('create-cleaner-onboarding-link', {
    body: { mode: 'link', returnTarget: 'web', confirmAge18: true },
  });
});
it('rejects another business’s Stripe key before creating any session', async () => {
  account = null;
  network.mockResolvedValue(Response.json({ id: 'acct_OTHER_BUSINESS' }));
  expect((await localPayoutSession(request(), deps())).status).toBe(502);
  expect(network).toHaveBeenCalledOnce();
  expect(invoke).not.toHaveBeenCalled();
});
it('hides provider failures and never forwards credentials or raw errors', async () => {
  network.mockResolvedValue(new Response('secret provider failure rk_live_fixture', { status: 403 }));
  const response = await localPayoutSession(request(), deps());
  expect(response.status).toBe(502);
  expect(await response.text()).not.toMatch(/rk_live|provider failure|acct_/);
});
