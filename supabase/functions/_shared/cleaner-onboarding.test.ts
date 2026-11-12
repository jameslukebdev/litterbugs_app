import { cleanerOnboardingResponse } from './cleaner-onboarding.ts';

const assert = (condition: unknown, message = 'Assertion failed') => { if (!condition) throw new Error(message); };
const userId = '91000000-0000-4000-8000-000000000001';
function fixture() {
  const calls: { session?: Record<string, any>; linked?: string; target?: string; accountCreates: number; updates: number } = { accountCreates: 0, updates: 0 };
  let signedIn = true;
  let anonymous = false;
  let payments = true;
  let existing = true;
  let ready = false;
  let profileDescription: string | null = 'Member-supplied description';
  let activityDue: string[] = [];
  let descriptionUpdate: unknown;
  let key = 'pk_test_fixture';
  const account = () => ({ id: 'acct_owned', identity: { entity_type: 'individual' }, configuration: { recipient: { capabilities: { stripe_balance: {
    stripe_transfers: { status: ready ? 'active' : 'pending' }, payouts: { status: ready ? 'active' : 'pending' },
  } } } } });
  const deps = {
    authenticatedUser: async () => signedIn ? ({ id: userId, email: 'fixture@example.com', is_anonymous: anonymous, user_metadata: {} }) : null,
    requiredEnv: () => key,
    serviceClient: () => ({
      from: (table: string) => ({
        select: () => ({ eq: (_column: string, value: string) => {
          if (table === 'cleaner_payout_accounts') assert(value === userId, 'Account ownership was not scoped to the authenticated user');
          return { single: async () => ({ data: { enabled: payments }, error: null }),
            maybeSingle: async () => ({ data: existing ? { stripe_account_id: 'acct_owned', age_18_confirmed_at: '2026-01-01' } : null, error: null }) };
        } }),
        update: () => ({ eq: async (_column: string, value: string) => { assert(value === userId); return { error: null }; } }),
      }),
      rpc: async (_name: string, args: Record<string, unknown>) => { assert(args.target_user_id === userId); assert(args.target_stripe_account_id === 'acct_owned'); return { error: null }; },
    }),
    retrieveStripeRecipientAccount: async (id: string) => { assert(id === 'acct_owned'); return account(); },
    configureStripeRecipientAsIndividual: async () => { calls.updates++; return account(); },
    stripeV2: async (_path: string, init: RequestInit) => {
      calls.accountCreates++;
      const body = JSON.parse(init.body as string);
      assert(body.dashboard === 'express' && body.identity.entity_type === 'individual');
      assert(body.configuration.recipient.capabilities.stripe_balance.stripe_transfers.requested);
      assert(body.defaults.responsibilities.fees_collector === 'application');
      return account();
    },
    stripeClient: () => ({
      accountSessions: { create: async (params: Record<string, any>) => { calls.session = params; return { client_secret: 'test_session_secret', expires_at: 1900000000 }; } },
      accounts: { retrieve: async (id: string) => { assert(id === 'acct_owned'); return { business_profile: { product_description: profileDescription }, requirements: { currently_due: activityDue } }; },
        update: async (id: string, params: unknown) => { assert(id === 'acct_owned'); descriptionUpdate = params; return {}; },
        createLoginLink: async (id: string) => { calls.linked = id; return { url: 'https://connect.stripe.com/dashboard' }; } },
    }),
    createStripeRecipientOnboardingLink: async (id: string, target: string) => { assert(id === 'acct_owned'); calls.target = target; return { url: 'https://connect.stripe.com/setup', expires_at: 'later' }; },
  } as unknown as NonNullable<Parameters<typeof cleanerOnboardingResponse>[1]>;
  const call = (body: Record<string, unknown> = {}) => cleanerOnboardingResponse(new Request('https://example.com', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'session', returnTarget: 'web', confirmAge18: true, ...body }),
  }), deps);
  return { call, calls, get descriptionUpdate() { return descriptionUpdate; }, set profileDescription(v: string | null) { profileDescription = v; }, set activityDue(v: string[]) { activityDue = v; }, set signedIn(v: boolean) { signedIn = v; }, set anonymous(v: boolean) { anonymous = v; },
    set payments(v: boolean) { payments = v; }, set existing(v: boolean) { existing = v; }, set ready(v: boolean) { ready = v; }, set key(v: string) { key = v; } };
}

Deno.test('embedded session is restricted to the caller-owned account and only onboarding', async () => {
  const f = fixture();
  const response = await f.call({ account: 'acct_someone_else', accountId: 'acct_someone_else' });
  assert(response.status === 200);
  const body = await response.json();
  assert(body.clientSecret === 'test_session_secret' && body.publishableKey === 'pk_test_fixture');
  assert(response.headers.get('Cache-Control') === 'no-store');
  assert(f.calls.session?.account === 'acct_owned');
  assert(JSON.stringify(f.calls.session?.components) === JSON.stringify({ account_onboarding: {
    enabled: true, features: { external_account_collection: true, disable_stripe_user_authentication: false },
  } }));
  assert(!body.url && !body.secretKey && !body.accountId);
});

Deno.test('the app can create an embedded session', async () => {
  const f = fixture();
  assert((await f.call({ returnTarget: 'mobile' })).status === 200);
  assert(f.calls.session);
});

Deno.test('signed-out, anonymous, disabled payments, unconfirmed age, and untargeted session calls cannot create sessions', async () => {
  for (const [change, body, status] of [
    [(f: ReturnType<typeof fixture>) => { f.signedIn = false; }, {}, 401],
    [(f: ReturnType<typeof fixture>) => { f.anonymous = true; }, {}, 401],
    [(f: ReturnType<typeof fixture>) => { f.payments = false; }, {}, 409],
    [() => {}, { confirmAge18: false }, 400],
    [() => {}, { returnTarget: 'elsewhere' }, 400],
  ] as const) {
    const f = fixture(); change(f);
    assert((await f.call(body)).status === status);
    assert(!f.calls.session && !f.calls.accountCreates && !f.calls.updates);
  }
});

Deno.test('first-time session creates the same v2 recipient configuration and stores ownership before delegating', async () => {
  const f = fixture(); f.existing = false;
  assert((await f.call()).status === 200);
  assert(f.calls.accountCreates === 1 && f.calls.session?.account === 'acct_owned');
});

Deno.test('status check for an unregistered member never creates a Stripe account or session', async () => {
  const f = fixture(); f.existing = false;
  const response = await f.call({ mode: 'status', confirmAge18: false });
  assert((await response.json()).onboardingStatus === 'not_started');
  assert(!f.calls.session && !f.calls.accountCreates);
});

Deno.test('native hosted onboarding and ready-account dashboard keep their previous paths', async () => {
  const f = fixture();
  assert((await f.call({ mode: 'link', returnTarget: 'mobile' })).status === 200);
  assert(f.calls.target === 'mobile' && !f.calls.session);
  assert((await f.call({ mode: 'dashboard' })).status === 409);
  f.ready = true;
  const response = await f.call({ mode: 'dashboard', confirmAge18: false });
  assert((await response.json()).url === 'https://connect.stripe.com/dashboard');
  assert(f.calls.linked === 'acct_owned' && !f.calls.session);
});

Deno.test('invalid public configuration fails before creating or altering a recipient', async () => {
  const f = fixture(); f.existing = false; f.key = 'sk_secret_must_never_reach_browser';
  const response = await f.call();
  assert(response.status === 500 && !(await response.text()).includes('sk_secret'));
  assert(!f.calls.session && !f.calls.accountCreates && !f.calls.updates);
});


Deno.test('embedded setup preserves a member description and fills required activity behind the scenes', async () => {
  const existing = fixture();
  assert((await existing.call()).status === 200);
  assert(!existing.descriptionUpdate, 'Existing member description was overwritten');
  const missing = fixture(); missing.profileDescription = null; missing.activityDue = ['business_profile.product_description'];
  assert((await missing.call()).status === 200);
  assert(JSON.stringify(missing.descriptionUpdate).includes('Individual participation in litter reporting'));
  const website = fixture(); website.profileDescription = null; website.activityDue = ['business_profile.url'];
  assert((await website.call()).status === 200);
  assert(website.descriptionUpdate, 'Activity description was not provided for the website alternative');
  const redacted = fixture(); redacted.profileDescription = null;
  assert((await redacted.call()).status === 200);
  assert(!redacted.descriptionUpdate, 'A redacted value without a requirement was overwritten');
});
