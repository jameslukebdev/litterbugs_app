import { processReporterPayout, reconcileReporterTransfer } from './reporter-payout.ts';
const assert = (value: unknown, message = 'Assertion failed') => { if (!value) throw new Error(message); };
const id = 'b3000000-0000-4000-8000-000000000001';
const reportId = 'b2000000-0000-4000-8000-000000000001';
function fixture() {
  const calls: Array<{ name: string; args?: Record<string, unknown> }> = [];
  const reward = { cleanup_attempt_id: id, report_id: reportId, reporter_id: 'b1000000-0000-4000-8000-000000000001',
    amount_cents: 500, payout_attempts: 1, attempt_started_at: new Date().toISOString(),
    stripe_destination_id: 'acct_reporter', stripe_transfer_id: null };
  const transfers: Array<{ params: any; options: any }> = [];
  let stripeError: unknown = null;
  let ledgerError = false;
  const admin = {
    rpc: async (name: string, args?: Record<string, unknown>) => {
      calls.push({ name, args });
      return name === 'claim_reporter_payout_operation' ? { data: reward } : { error: ledgerError ? new Error('DB interrupted') : null };
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: reward }) }) }) }),
  } as unknown as Parameters<typeof processReporterPayout>[0];
  const stripe = { transfers: { create: async (params: any, options: any) => {
    transfers.push({ params, options }); if (stripeError) throw stripeError; return { id: 'tr_reporter' };
  } } } as unknown as Parameters<typeof processReporterPayout>[1];
  const transfer = { id: 'tr_reporter', amount: 500, currency: 'usd', destination: 'acct_reporter',
    metadata: { reporter_reward_id: id, report_id: reportId, reporter_payout_attempt: '1' } };
  return { admin, stripe, calls, reward, transfers, transfer,
    set stripeError(value: unknown) { stripeError = value; }, set ledgerError(value: boolean) { ledgerError = value; } };
}
Deno.test('reporter transfer uses its own idempotency key and never cleaner metadata', async () => {
  const f = fixture(); await processReporterPayout(f.admin, f.stripe);
  assert(f.transfers[0].params.amount === 500 && f.transfers[0].params.destination === 'acct_reporter');
  assert(f.transfers[0].params.metadata.cleanup_attempt_id === undefined);
  assert(f.transfers[0].options.idempotencyKey === `reporter-payout-${id}-1`);
  assert(f.calls[1].args?.target_status === 'transferred');
});
Deno.test('uncertain Stripe response and interrupted ledger writes retain the same transfer key', async () => {
  const f = fixture(); f.stripeError = { type: 'StripeConnectionError' };
  try { await processReporterPayout(f.admin, f.stripe); } catch { /* expected */ }
  assert(f.calls.length === 1, 'uncertain transfers must not be marked definitely failed');
  f.stripeError = null; f.ledgerError = true;
  try { await processReporterPayout(f.admin, f.stripe); } catch { /* expected */ }
  f.ledgerError = false; await processReporterPayout(f.admin, f.stripe);
  assert(new Set(f.transfers.map(call => call.options.idempotencyKey)).size === 1);
});
Deno.test('expired idempotency protection never creates another transfer', async () => {
  const f = fixture(); f.reward.attempt_started_at = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await processReporterPayout(f.admin, f.stripe);
  assert(f.transfers.length === 0 && f.calls[1].args?.block_retry === true);
});
Deno.test('definite Stripe rejection enters existing admin retry path', async () => {
  const f = fixture(); f.stripeError = { type: 'StripeInvalidRequestError', message: 'Account restricted' };
  try { await processReporterPayout(f.admin, f.stripe); } catch { /* expected */ }
  assert(f.calls[1].args?.target_status === 'failed');
});
Deno.test('webhooks require matching recipient, amount, currency, report and attempt', async () => {
  for (const change of [{ amount: 501 }, { currency: 'eur' }, { destination: 'acct_wrong' },
    { metadata: { reporter_reward_id: id, report_id: reportId, reporter_payout_attempt: '2' } }]) {
    const f = fixture(); await reconcileReporterTransfer(f.admin, { ...f.transfer, ...change }, false); assert(f.calls.length === 0);
  }
  const f = fixture(); await reconcileReporterTransfer(f.admin, f.transfer, false);
  assert(f.calls[0].args?.target_status === 'transferred');
});
Deno.test('partial and complete reversals require review instead of repaying the full reward', async () => {
  for (const reversed of [true, false]) {
    const f = fixture(); await reconcileReporterTransfer(f.admin, { ...f.transfer, amount_reversed: 100 }, reversed);
    assert(f.calls[0].args?.target_status === 'reversed');
  }
});

Deno.test('unsettled Stripe balance waits and retries automatically without an admin failure', async () => {
  const f = fixture(); f.stripeError = { type: 'StripeInvalidRequestError', code: 'balance_insufficient' };
  const result = await processReporterPayout(f.admin, f.stripe);
  assert(result?.status === 'waiting_funds' && f.calls[1].args?.target_status === 'waiting_funds');
});
