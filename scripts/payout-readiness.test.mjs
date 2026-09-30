// Async fixture boundaries intentionally return Promises without real I/O.
// deno-lint-ignore-file require-await
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { edgeHarness, plain } from './test-support/edge-function-harness.mjs';

const accountId = 'acct_fixture_cleaner';
const cleanupId = '11111111-1111-4111-8111-111111111111';
const cleanerId = '22222222-2222-4222-8222-222222222222';
const reportId = '33333333-3333-4333-8333-333333333333';
const sdkMocks = {
  'npm:@supabase/supabase-js@2.87.1': { createClient: () => { throw new Error('Real database client forbidden'); } },
  'npm:stripe@22.5.0': { default: class { constructor() { throw new Error('Real Stripe client forbidden'); } } },
};
const pure = edgeHarness({ mocks: sdkMocks }).load('_shared/funded-cleanup.ts');
const readyAccount = () => ({
  id: accountId, identity: { country: 'us', entity_type: 'individual' },
  requirements: { entries: [] },
  configuration: { recipient: { capabilities: { stripe_balance: {
    stripe_transfers: { status: 'active' }, payouts: { status: 'active' },
  } } } },
});

test('recipient readiness requires both active capabilities and no user requirement', () => {
  assert.deepEqual(plain(pure.stripeRecipientState(readyAccount())), {
    payoutsEnabled: true, onboardingStatus: 'enabled', requirementsDue: [],
  });
  for (const capability of ['stripe_transfers', 'payouts']) {
    for (const status of ['pending', 'restricted', undefined]) {
      const account = readyAccount();
      account.configuration.recipient.capabilities.stripe_balance[capability].status = status;
      const result = pure.stripeRecipientState(account);
      assert.equal(result.payoutsEnabled, false, `${capability}: ${status}`);
      assert.equal(result.onboardingStatus, status === 'pending' ? 'pending' : 'restricted');
    }
  }
  assert.equal(pure.stripeRecipientState({ id: accountId }).payoutsEnabled, false);
});

test('recipient requirements distinguish user action from Stripe review and deduplicate recovery copy', () => {
  const account = readyAccount();
  account.requirements.entries = [
    { awaiting_action_from: 'user', description: 'Verify identity' },
    { awaiting_action_from: 'user', description: 'Verify identity' },
    { awaiting_action_from: 'user' },
    { awaiting_action_from: 'stripe', description: 'Internal review' },
  ];
  assert.deepEqual(plain(pure.stripeRecipientState(account)), {
    payoutsEnabled: false, onboardingStatus: 'pending',
    requirementsDue: ['Verify identity', 'Additional Stripe information is required'],
  });
  account.requirements.entries = [{ awaiting_action_from: 'stripe' }];
  assert.equal(pure.stripeRecipientState(account).payoutsEnabled, true);
});

function fixture({ enabled = true, paymentsEnabled = true, transferError = null, account = readyAccount() } = {}) {
  const records = new Map();
  const rpcCalls = [];
  const transferCalls = [];
  const updates = [];
  let cachedEnabled = enabled;
  let retrieved = 0;
  let operation = { id: cleanupId, cleaner_id: cleanerId, report_id: reportId,
    reward_amount_cents: 500, payout_attempts: 1 };
  const admin = {
    from(table) {
      const filters = {};
      let update;
      const query = {
        select() { return this; },
        eq(key, value) { filters[key] = value; return this; },
        in() { return this; },
        update(value) { update = value; return this; },
        async insert(value) { records.set(value.event_id, plain(value)); return { error: null }; },
        async maybeSingle() { return { data: table === 'processed_stripe_events'
          ? records.get(filters.event_id) ?? null : { user_id: cleanerId }, error: null }; },
        async single() { assert.equal(table, 'cleaner_payout_accounts');
          return { data: { stripe_account_id: accountId, payouts_enabled: cachedEnabled }, error: null }; },
        then(resolve) {
          if (update) { updates.push({ table, update: plain(update), filters }); return Promise.resolve({ error: null }).then(resolve); }
          assert.ok(['cleanup_feature_flags', 'cleanup_contributions'].includes(table), table);
          const data = table === 'cleanup_feature_flags'
            ? [{ name: 'payments_enabled', enabled: paymentsEnabled }]
            : [{ stripe_charge_id: 'ch_fixture', principal_amount_cents: 500 }];
          return Promise.resolve({ data, error: null }).then(resolve);
        },
      };
      return query;
    },
    async rpc(name, args) {
      rpcCalls.push({ name, args: args && plain(args) });
      if (name === 'claim_cleanup_refund_operation') return { data: [], error: null };
      if (name === 'claim_cleanup_payout_operation') return { data: [operation], error: null };
      if (name === 'sync_cleaner_payout_account') cachedEnabled = args.target_payouts_enabled;
      assert.ok(['claim_cleanup_payout_operation', 'sync_cleaner_payout_account', 'mark_cleanup_payout_result'].includes(name), name);
      return { data: null, error: null };
    },
  };
  const stripe = {
    webhooks: { constructEventAsync: async (body, signature, secret) => {
      if (signature !== secret) throw new Error('Invalid signature');
      return JSON.parse(body);
    } },
    parseEventNotificationAsync: async (body, signature, secret) => {
      if (signature !== secret) throw new Error('Invalid signature');
      return JSON.parse(body);
    },
    transfers: { create: async (body, options) => {
      transferCalls.push({ body: plain(body), options: plain(options) });
      if (transferError) throw transferError;
      return { id: 'tr_fixture' };
    } },
  };
  const mocks = {
    ...sdkMocks,
    '_shared/funded-cleanup.ts': {
      ...pure, serviceClient: () => admin, stripeClient: () => stripe,
      requiredEnv: (name) => { assert.ok(env[name], `Unexpected environment request: ${name}`); return env[name]; },
      retrieveStripeRecipientAccount: async (id) => { assert.equal(id, accountId); retrieved++; return account; },
    },
    '_shared/apple-revocation.ts': { processAppleRevocation: async () => null },
    '_shared/reconcile-payment.ts': { reconcileSuccessfulPaymentIntent: () => { throw new Error('Unexpected payment operation'); } },
  };
  const env = { FINANCIAL_MAINTENANCE_SECRET: 'fixture-maintenance',
    STRIPE_WEBHOOK_SECRET: 'fixture-live', STRIPE_TEST_WEBHOOK_SECRET: 'fixture-test',
    STRIPE_V2_WEBHOOK_SECRET: 'fixture-v2' };
  const worker = edgeHarness({ mocks, env });
  worker.load('run-financial-maintenance/index.ts');
  const webhook = edgeHarness({ mocks, env });
  webhook.load('stripe-webhook/index.ts');
  return { records, rpcCalls, transferCalls, updates,
    get retrieved() { return retrieved; },
    retry() { operation = { ...operation, payout_attempts: operation.payout_attempts + 1 }; },
    clearError() { transferError = null; },
    work: () => worker.handle(new Request('https://fixture.invalid/worker', {
      method: 'POST', headers: { 'x-financial-maintenance-secret': env.FINANCIAL_MAINTENANCE_SECRET }, body: '{}',
    })),
    event: (event, signature = 'fixture-live') => webhook.handle(new Request('https://fixture.invalid/webhook', {
      method: 'POST', headers: { 'stripe-signature': signature }, body: JSON.stringify(event),
    })),
  };
}

const bankEvent = (type, { id = `evt_${type}`, account = accountId, livemode = true, created = 100 } = {}) => ({
  id, type, account, livemode, created,
  data: { object: { id: 'po_fixture', object: 'payout', amount: 1500, currency: 'usd',
    status: ({ created: 'pending', updated: 'in_transit', paid: 'paid', failed: 'failed', canceled: 'canceled' })[type.split('.')[1]],
    failure_code: type === 'payout.failed' ? 'account_closed' : null } },
});

test('bank payout fixture boundary: current handler retains outcomes but does not reconcile rewards', async () => {
  const f = fixture();
  for (const type of ['payout.created', 'payout.updated', 'payout.paid', 'payout.failed', 'payout.canceled']) {
    const event = bankEvent(type);
    assert.equal((await f.event(event)).status, 200);
    assert.deepEqual(f.records.get(event.id).payload, event);
  }
  assert.deepEqual(f.rpcCalls, []);
  assert.deepEqual(f.transferCalls, []);
  assert.equal(f.retrieved, 0);
  // Characterizes the real gap: acknowledgement is not bank reconciliation.
  assert.equal(f.records.get('evt_payout.failed').payload.data.object.failure_code, 'account_closed');
});

test('duplicate and late bank fixtures preserve evidence without inventing cleanup allocation', async () => {
  const f = fixture();
  const paid = bankEvent('payout.paid', { created: 200 });
  await f.event(paid);
  assert.deepEqual(await (await f.event(paid)).json(), { received: true, duplicate: true });
  await f.event(bankEvent('payout.created', { created: 100 }));
  await f.event(bankEvent('payout.failed', { created: 300 }));
  assert.equal(f.records.size, 3);
  assert.deepEqual(f.rpcCalls, []);
  assert.equal(f.records.get('evt_payout.paid').payload.data.object.amount, 1500);
});

test('unknown recipient bank outcome is recorded but cannot mutate known cleaner state', async () => {
  const f = fixture();
  assert.equal((await f.event(bankEvent('payout.failed', { account: 'acct_unknown' }))).status, 200);
  assert.deepEqual(f.rpcCalls, []);
  assert.equal(f.retrieved, 0);
});

test('actual signature-mode gate rejects live bank fixture signed with test secret', async () => {
  const f = fixture();
  assert.equal((await f.event(bankEvent('payout.failed'), 'fixture-test')).status, 400);
  assert.equal(f.records.size, 0);
  assert.equal((await f.event(bankEvent('payout.failed', { livemode: false }), 'fixture-test')).status, 200);
  assert.equal(f.records.get('evt_payout.failed').livemode, false);
});

test('payment feature gate prevents maintenance from creating any transfer', async () => {
  const f = fixture({ paymentsEnabled: false });
  assert.equal((await f.work()).status, 200);
  assert.deepEqual(f.rpcCalls, []);
  assert.deepEqual(f.transferCalls, []);
});

test('cached ineligible recipient stays blocked until account webhook refreshes readiness', async () => {
  const f = fixture({ enabled: false });
  assert.equal((await f.work()).status, 500);
  assert.deepEqual(f.transferCalls, []);
  assert.equal(f.rpcCalls.at(-1).args.transfer_succeeded, false);
  assert.equal(f.retrieved, 0); // Worker does not refresh this cache itself.
  await f.event({ id: 'evt_ready', object: 'v2.core.event',
    type: 'v2.core.account[configuration.recipient].capability_status_updated',
    livemode: true, related_object: { id: accountId } }, 'fixture-v2');
  assert.equal(f.retrieved, 1);
  f.retry();
  const response = await f.work();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).payout.status, 'transferred');
  assert.equal(f.transferCalls.length, 1);
  assert.equal(f.transferCalls[0].body.destination, accountId);
  assert.equal(f.transferCalls[0].body.amount, 500);
  assert.equal(f.transferCalls[0].body.source_transaction, 'ch_fixture');
});

test('stale eligible cache plus processor rejection records failure, not successful payout', async () => {
  const f = fixture({ transferError: { type: 'StripeInvalidRequestError', message: 'Recipient restricted' } });
  assert.equal((await f.work()).status, 500);
  assert.equal(f.retrieved, 0);
  assert.equal(f.rpcCalls.at(-1).args.transfer_succeeded, false);
  assert.equal(f.rpcCalls.at(-1).args.target_transfer_id, null);
  assert.equal(f.rpcCalls.at(-1).args.target_error, 'Recipient restricted');
});

test('capability restriction webhook refresh blocks a previously eligible cached account', async () => {
  const account = readyAccount();
  account.configuration.recipient.capabilities.stripe_balance.payouts.status = 'restricted';
  const f = fixture({ account });
  assert.equal((await f.event({ id: 'evt_restricted', object: 'v2.core.event',
    type: 'v2.core.account[configuration.recipient].capability_status_updated',
    livemode: true, related_object: { id: accountId } }, 'fixture-v2')).status, 200);
  assert.equal(f.rpcCalls.at(-1).args.target_payouts_enabled, false);
  assert.equal((await f.work()).status, 500);
  assert.deepEqual(f.transferCalls, []);
});

test('closed recipient webhook blocks payout without trying to retrieve the closed account', async () => {
  const f = fixture();
  assert.equal((await f.event({ id: 'evt_closed', object: 'v2.core.event',
    type: 'v2.core.account.closed', livemode: true,
    related_object: { id: accountId } }, 'fixture-v2')).status, 200);
  assert.equal(f.retrieved, 0);
  assert.equal(f.rpcCalls.at(-1).args.target_payouts_enabled, false);
  assert.equal((await f.work()).status, 500);
  assert.deepEqual(f.transferCalls, []);
});

test('transient processor failure retains retry idempotency without marking payout failed', async () => {
  const f = fixture({ transferError: { type: 'StripeConnectionError', message: 'Fixture timeout' } });
  assert.equal((await f.work()).status, 500);
  assert.equal(f.rpcCalls.filter((c) => c.name === 'mark_cleanup_payout_result').length, 0);
  assert.equal(f.updates.length, 1);
  f.clearError();
  assert.equal((await f.work()).status, 200);
  assert.deepEqual(f.transferCalls[0], f.transferCalls[1]);
  assert.equal(f.rpcCalls.at(-1).args.transfer_succeeded, true);
});
