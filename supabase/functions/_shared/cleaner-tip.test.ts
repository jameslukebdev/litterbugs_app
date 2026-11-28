import { createCleanerTipResponse, reconcileCleanerTipPaymentIntent, reconcileCleanerTipRefund, tipFeeCents } from './cleaner-tip.ts';

const assert = (condition: unknown, message = 'Assertion failed') => { if (!condition) throw new Error(message); };
const cleanerId = '91000000-0000-4000-8000-000000000001';
const tipperId = '91000000-0000-4000-8000-000000000002';
const requestId = '91000000-0000-4000-8000-0000000000aa';

type Row = Record<string, any>;

/** A tiny in-memory stand-in for the parts of the Supabase client the tip code uses. */
function fixture() {
  const state = {
    flag: true, ready: true, stripeReady: true, showOnBoards: true,
    signedIn: null as null | { id: string; email: string; is_anonymous: boolean },
    tips: [] as Row[], intents: [] as Row[], intentCreates: 0,
    reports: [] as Row[], attempts: [] as Row[],
  };
  const match = (row: Row, filters: [string, string, unknown][]) => filters.every(([op, column, value]) =>
    op === 'eq' ? row[column] === value : op === 'is' ? row[column] === value : (value as unknown[]).includes(row[column]));
  const query = (table: string) => {
    const filters: [string, string, unknown][] = [];
    let patch: Row | null = null;
    const rows = () => {
      if (table === 'cleanup_feature_flags') return [{ enabled: state.flag }];
      if (table === 'cleaner_payout_accounts') return state.ready ? [{ stripe_account_id: 'acct_cleaner', onboarding_status: 'enabled',
        payouts_enabled: true, country: 'US', age_18_confirmed_at: '2026-01-01' }] : [];
      if (table === 'reports') return state.reports.filter(row => match(row, filters));
      if (table === 'cleanup_attempts') return state.attempts.filter(row => match(row, filters));
      return state.tips.filter(row => match(row, filters));
    };
    const builder: any = {
      select: () => builder,
      eq: (column: string, value: unknown) => { filters.push(['eq', column, value]); return builder; },
      is: (column: string, value: unknown) => { filters.push(['is', column, value]); return builder; },
      in: (column: string, value: unknown[]) => { filters.push(['in', column, value]); return builder; },
      limit: () => builder,
      maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
      single: async () => ({ data: rows()[0] ?? null, error: rows()[0] ? null : { message: 'not found' } }),
      insert: async (row: Row) => {
        if (state.tips.some(tip => tip.client_request_id === row.client_request_id)) return { error: { code: '23505' } };
        state.tips.push({ id: `tip-${state.tips.length + 1}`, status: 'pending', stripe_payment_intent_id: null, ...row });
        return { error: null };
      },
      update: (next: Row) => { patch = next; return builder; },
      then: (resolve: (value: unknown) => void) => {
        if (patch) for (const row of state.tips.filter(row => match(row, filters))) Object.assign(row, patch);
        resolve({ error: null });
      },
    };
    return builder;
  };
  const admin = {
    from: query,
    rpc: (_name: string, args: Row) => ({ maybeSingle: async () => {
      if (args.target_profile_id === tipperId) return { data: { name: 'Sam T.' }, error: null };
      assert(args.target_profile_id === cleanerId);
      return { data: state.showOnBoards ? { name: 'Jordan R.', can_receive_tips: true } : null, error: null };
    } }),
  };
  const stripe = { paymentIntents: {
    create: async (params: Row, options: Row) => {
      state.intentCreates++;
      assert(options.idempotencyKey.startsWith('cleaner-tip-'));
      const intent = { id: `pi_${state.intentCreates}`, client_secret: 'pi_secret', status: 'requires_payment_method', amount: params.amount,
        currency: params.currency, application_fee_amount: params.application_fee_amount, transfer_data: params.transfer_data,
        metadata: params.metadata, receipt_email: params.receipt_email };
      state.intents.push(intent);
      return intent;
    },
    retrieve: async (id: string) => state.intents.find(intent => intent.id === id),
  } };
  const deps = {
    authenticatedUser: async () => state.signedIn,
    serviceClient: () => admin,
    stripeClient: () => stripe,
    requiredEnv: () => 'pk_test_fixture',
    retrieveStripeRecipientAccount: async (id: string) => {
      assert(id === 'acct_cleaner');
      const status = state.stripeReady ? 'active' : 'pending';
      return { id, configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { status }, payouts: { status } } } } } };
    },
  } as unknown as NonNullable<Parameters<typeof createCleanerTipResponse>[1]>;
  const call = (body: Row = {}) => createCleanerTipResponse(new Request('https://example.com', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cleanerId, tipAmountCents: 500, clientRequestId: requestId, receiptEmail: 'guest@example.com', ...body }),
  }), deps);
  return { state, call, admin: admin as any };
}

Deno.test('fee is 50¢ plus 5% on top, and the cleaner keeps the whole tip', () => {
  assert(tipFeeCents(500) === 75 && tipFeeCents(1000) === 100 && tipFeeCents(300) === 65 && tipFeeCents(2000) === 150);
});

Deno.test('a guest tip creates one destination charge straight to the cleaner', async () => {
  const f = fixture();
  const response = await f.call();
  assert(response.status === 200, `status ${response.status}`);
  const body = await response.json();
  assert(body.tipAmountCents === 500 && body.platformFeeCents === 75 && body.totalAmountCents === 575);
  const [intent] = f.state.intents;
  assert(intent.amount === 575 && intent.application_fee_amount === 75);
  assert(intent.transfer_data.destination === 'acct_cleaner');
  assert(intent.metadata.purpose === 'cleaner_tip' && intent.receipt_email === 'guest@example.com');
  assert(f.state.tips[0].tipper_id === null && f.state.tips[0].stripe_payment_intent_id === 'pi_1');

  // A retry reuses the same tip and payment, never a second charge.
  assert((await f.call()).status === 200);
  assert(f.state.intentCreates === 1 && f.state.tips.length === 1);
  // The same request can't be repriced.
  assert((await f.call({ tipAmountCents: 2000 })).status === 409);
});

Deno.test('rejects bad amounts, missing receipt email, self-tips, closed tips and cleaners who can’t be paid', async () => {
  for (const amount of [299, 100001, 5.5]) assert((await fixture().call({ tipAmountCents: amount })).status === 400);
  assert((await fixture().call({ receiptEmail: '' })).status === 400);
  const self = fixture();
  self.state.signedIn = { id: cleanerId, email: 'me@example.com', is_anonymous: false };
  assert((await self.call()).status === 400);
  const off = fixture(); off.state.flag = false; assert((await off.call()).status === 409);
  const notSetUp = fixture(); notSetUp.state.ready = false; assert((await notSetUp.call()).status === 409);
  const stripeBlocked = fixture(); stripeBlocked.state.stripeReady = false; assert((await stripeBlocked.call()).status === 409);
  const hidden = fixture(); hidden.state.showOnBoards = false; assert((await hidden.call()).status === 409);
  for (const f of [off, notSetUp, stripeBlocked, hidden]) assert(f.state.intentCreates === 0 && f.state.tips.length === 0);
});

Deno.test('a signed-in tipper is recorded and their account email is used for the receipt', async () => {
  const f = fixture();
  f.state.signedIn = { id: tipperId, email: 'member@example.com', is_anonymous: false };
  assert((await f.call({ receiptEmail: undefined })).status === 200);
  assert(f.state.tips[0].tipper_id === tipperId && f.state.intents[0].receipt_email === 'member@example.com');
});

Deno.test('webhook marks tips paid, failed and refunded, and rejects mismatched payments', async () => {
  const f = fixture();
  await f.call();
  const intent = { ...f.state.intents[0], amount_received: 575, latest_charge: 'ch_1' };
  await reconcileCleanerTipPaymentIntent(f.admin, intent as any, true);
  assert(f.state.tips[0].status === 'succeeded' && f.state.tips[0].stripe_charge_id === 'ch_1' && f.state.tips[0].paid_at);

  assert(await reconcileCleanerTipRefund(f.admin, { payment_intent: 'pi_1', status: 'succeeded' } as any));
  assert(f.state.tips[0].status === 'refunded' && f.state.tips[0].refunded_at);
  assert(!await reconcileCleanerTipRefund(f.admin, { payment_intent: 'pi_contribution', status: 'succeeded' } as any));

  let threw = false;
  try { await reconcileCleanerTipPaymentIntent(f.admin, { ...intent, application_fee_amount: 10 } as any, true); } catch { threw = true; }
  assert(threw, 'A changed fee must not be accepted');
  threw = false;
  try { await reconcileCleanerTipPaymentIntent(f.admin, { ...intent, id: 'pi_unknown' } as any, true); } catch { threw = true; }
  assert(threw, 'Unknown tip payments must be retried, not ignored');

  const failed = fixture();
  await failed.call();
  await reconcileCleanerTipPaymentIntent(failed.admin, failed.state.intents[0] as any, false, 'card_declined');
  assert(failed.state.tips[0].status === 'failed' && failed.state.tips[0].failure_code === 'card_declined');
});

Deno.test('a tip carries the sender’s name, their note and the report it came from', async () => {
  const reportId = '91000000-0000-4000-8000-0000000000bb';
  const f = fixture();
  f.state.reports.push({ id: reportId, user_id: tipperId });
  f.state.attempts.push({ id: 'a', report_id: reportId, cleaner_id: cleanerId, status: 'completed' });
  assert((await f.call({ tipperName: '  Sarah   K ', note: ' Thanks for the creek! ', reportId, role: 'cleaner' })).status === 200);
  const tip = f.state.tips[0];
  assert(tip.tipper_name === 'Sarah K' && tip.note === 'Thanks for the creek!' && tip.report_id === reportId && tip.recipient_role === 'cleaner');

  // A report the person had nothing to do with is not linked; signed-in members default to their leaderboard name.
  const other = fixture();
  other.state.signedIn = { id: tipperId, email: 'member@example.com', is_anonymous: false };
  other.state.reports.push({ id: reportId, user_id: 'someone-else' });
  assert((await other.call({ reportId, role: 'reporter' })).status === 200);
  assert(other.state.tips[0].report_id === null && other.state.tips[0].tipper_name === 'Sam T.' && other.state.tips[0].recipient_role === 'reporter');

  // Guests without a name stay anonymous; over-long notes are refused before anything is created.
  const guest = fixture();
  assert((await guest.call()).status === 200 && guest.state.tips[0].tipper_name === null && guest.state.tips[0].note === null);
  const long = fixture();
  assert((await long.call({ note: 'x'.repeat(281) })).status === 400 && long.state.tips.length === 0);
});
