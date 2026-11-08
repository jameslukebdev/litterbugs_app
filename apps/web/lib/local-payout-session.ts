import type { createClient } from '@/lib/supabase/server';

type Dependencies = { createClient: typeof createClient; env: NodeJS.ProcessEnv; fetch: typeof fetch };
const PLATFORM = 'acct_1U2HZe40KMkUKMFW';
const loopback = (hostname: string) => ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
const reply = (body: object, status = 200) => Response.json(body, {
  status, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
});

/** Local bridge while the embedded Edge Function release is held. Never available in a deployment. */
export async function localPayoutSession(request: Request, deps: Dependencies) {
  const url = new URL(request.url);
  if (deps.env.NODE_ENV !== 'development' || deps.env.VERCEL || !loopback(url.hostname)
    || request.headers.get('host') !== url.host) return reply({ error: 'Not found' }, 404);
  if (request.headers.get('origin') !== url.origin) return reply({ error: 'Request not allowed' }, 403);
  const secret = deps.env.LITTERBUGS_LOCAL_STRIPE_SECRET_KEY;
  const publishable = deps.env.LITTERBUGS_LOCAL_STRIPE_PUBLISHABLE_KEY;
  if (!secret || !/^(sk|rk)_(live|test)_/.test(secret) || !publishable || !/^pk_(live|test)_/.test(publishable)
    || secret.split('_')[1] !== publishable.split('_')[1]) {
    return reply({ error: 'The local payout preview still needs its Stripe connection. Nothing has been submitted.' }, 503);
  }
  try {
    const client = await deps.createClient();
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user || user.is_anonymous) return reply({ error: 'Please sign in again to set up payouts.' }, 401);
    const body = await request.json();
    if (body.confirmAge18 !== true) return reply({ error: 'Please confirm your payout eligibility first.' }, 400);
    const { data: flag, error: flagError } = await client.from('cleanup_feature_flags')
      .select('enabled').eq('name', 'payments_enabled').single();
    if (flagError || !flag?.enabled) return reply({ error: 'Payout setup is unavailable right now.' }, 409);

    async function stripe(path: string, body?: URLSearchParams) {
      const response = await deps.fetch(`https://api.stripe.com/v1/${path}`, {
        method: body ? 'POST' : 'GET', cache: 'no-store', signal: AbortSignal.timeout(20_000),
        headers: { Authorization: `Bearer ${secret}`, 'Stripe-Version': '2026-07-29.dahlia',
          ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
        ...(body ? { body } : {}),
      });
      if (!response.ok) throw new Error('Stripe request failed');
      return response.json();
    }
    // Refuse keys for Grant's other businesses before touching any connected account.
    const platform = await stripe('account');
    if (platform.id !== PLATFORM) throw new Error('Wrong platform');

    const readAccount = () => client.from('cleaner_payout_accounts')
      .select('stripe_account_id, age_18_confirmed_at').eq('user_id', user.id).maybeSingle();
    let account = await readAccount();
    if (account.error) throw new Error('Account lookup failed');
    if (!account.data?.stripe_account_id || !account.data.age_18_confirmed_at) {
      // The existing authenticated service creates the recipient and records eligibility.
      // Discard its hosted URL; the cleaner stays in the local embedded flow.
      const initialized = await client.functions.invoke('create-cleaner-onboarding-link', {
        body: { mode: 'link', returnTarget: 'web', confirmAge18: true },
      });
      if (initialized.error || initialized.data?.error) throw new Error('Recipient setup failed');
      account = await readAccount();
    }
    const accountId = account.data?.stripe_account_id;
    if (account.error || !accountId || !/^acct_[A-Za-z0-9]+$/.test(accountId) || !account.data?.age_18_confirmed_at) {
      throw new Error('Recipient unavailable');
    }

    // Recipient profile/activity defaults remain owned by the existing onboarding service.
    const session = await stripe('account_sessions', new URLSearchParams({
      account: accountId,
      'components[account_onboarding][enabled]': 'true',
      'components[account_onboarding][features][external_account_collection]': 'true',
      'components[account_onboarding][features][disable_stripe_user_authentication]': 'false',
    }));
    if (typeof session.client_secret !== 'string' || !session.client_secret || !Number.isFinite(session.expires_at)
      || session.expires_at * 1000 <= Date.now()) throw new Error('Invalid session');
    return reply({ clientSecret: session.client_secret, publishableKey: publishable, expiresAt: session.expires_at });
  } catch {
    // Never forward provider errors, credentials, account IDs or session secrets into logs or UI.
    return reply({ error: 'Your payout form couldn’t open. Please try again or continue on Stripe.' }, 502);
  }
}
