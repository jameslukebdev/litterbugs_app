import { createContributionResponse } from './create-contribution.ts';

const assert = (condition: unknown, message = 'Assertion failed') => { if (!condition) throw new Error(message); };
const userId = '91000000-0000-4000-8000-000000000001';
const reportId = '92000000-0000-4000-8000-000000000001';
const requestId = '93000000-0000-4000-8000-000000000001';
function fixture() {
  let activeVersion = 2;
  let createCount = 0;
  let attachFailures = 0;
  let row: Record<string, any> | null = null;
  let intent: Record<string, any> | null = null;
  const deps = {
    authenticatedUser: async () => ({ id: userId, email: 'fixture@example.com', is_anonymous: false }),
    requiredEnv: () => 'pk_test_fixture',
    serviceClient: () => ({ rpc: async (name: string, args: Record<string, any>) => {
      if (name === 'reserve_cleanup_contribution') {
        if (row) {
          if (row.report_id !== args.target_report_id || row.principal_amount_cents !== args.principal_cents) return { error: new Error('cleanup_contribution_idempotency_mismatch') };
          return { data: row };
        }
        if (args.expected_pricing_version !== activeVersion) return { error: new Error('cleanup_pricing_changed') };
        const fee = Math.floor((args.principal_cents + 5) / 10) + (activeVersion === 2 ? 50 : 0);
        row = { id: requestId, report_id: reportId, principal_amount_cents: args.principal_cents, platform_fee_cents: fee,
          total_amount_cents: args.principal_cents + fee, pricing_version: activeVersion, stripe_receipt_email: args.receipt_email,
          stripe_payment_intent_id: null, created_at: new Date().toISOString() };
        return { data: row };
      }
      if (attachFailures-- > 0) return { error: new Error('interrupted attachment') };
      row!.stripe_payment_intent_id = args.payment_intent_id;
      return { data: row };
    }}),
    stripeClient: () => ({ paymentIntents: {
      create: async (params: Record<string, any>, options: Record<string, any>) => {
        assert(row, 'Stripe called before reservation');
        assert(options.idempotencyKey === `cleanup-reservation-${requestId}`);
        if (!intent) { createCount++; intent = { ...params, id: 'pi_fixture', client_secret: 'pi_fixture_secret', status: 'requires_payment_method' }; }
        return intent;
      },
      retrieve: async (id: string) => { assert(id === intent!.id); return intent; },
    }}),
  } as unknown as NonNullable<Parameters<typeof createContributionResponse>[1]>;
  const call = (body: Record<string, unknown> = {}) => createContributionResponse(new Request('https://example.com', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reportId, principalAmountCents: 100, clientRequestId: requestId, pricingVersion: 2, ...body }),
  }), deps);
  return { call, get row() { return row!; }, get intent() { return intent!; }, get createCount() { return createCount; },
    set activeVersion(v: number) { activeVersion = v; }, set attachFailures(n: number) { attachFailures = n; } };
}
Deno.test('new $1 charge uses server quote, repeated and concurrent calls reuse one PaymentIntent', async () => {
  const f = fixture();
  const results = await Promise.all([f.call(), f.call(), f.call()]);
  for (const response of results) {
    assert(response.status === 200);
    const data = await response.json();
    assert(data.principalAmountCents === 100 && data.platformFeeCents === 60 && data.totalAmountCents === 160 && data.pricingVersion === 2);
  }
  assert(f.createCount === 1);
});
Deno.test('legacy clients are rejected before Stripe and receive an update message', async () => {
  const f = fixture(); const response = await f.call({ pricingVersion: undefined });
  assert(response.status === 409); assert((await response.json()).error.includes('update the app')); assert(f.createCount === 0);
});
Deno.test('old pending payment keeps original price after activation and after 24 hours', async () => {
  const f = fixture(); f.activeVersion = 1;
  assert((await f.call({ pricingVersion: undefined })).status === 200);
  f.activeVersion = 2; f.row.created_at = '2026-01-01T00:00:00Z'; delete f.intent.metadata.pricing_version;
  const response = await f.call(); const data = await response.json();
  assert(response.status === 200 && data.platformFeeCents === 10 && data.totalAmountCents === 110 && data.pricingVersion === 1);
  assert(f.createCount === 1);
});
Deno.test('interruption after Stripe creation recovers original intent; unsafe aged orphan does not create another', async () => {
  const f = fixture(); f.attachFailures = 1;
  assert((await f.call()).status === 500); assert(f.createCount === 1);
  assert((await f.call()).status === 200); assert(f.createCount === 1);
  f.row.stripe_payment_intent_id = null; f.row.created_at = '2026-01-01T00:00:00Z';
  assert((await f.call()).status === 409); assert(f.createCount === 1);
});
Deno.test('submitted or canceled payments cannot be paid again; declined intent can be retried', async () => {
  const f = fixture(); await f.call();
  for (const status of ['succeeded','processing','canceled']) {
    f.intent.status = status; assert((await f.call()).status === 409);
  }
  f.intent.status = 'requires_payment_method'; assert((await f.call()).status === 200); assert(f.createCount === 1);
});
Deno.test('mismatched identities, totals, and pricing metadata cannot expose a payment secret', async () => {
  const f = fixture(); await f.call();
  assert((await f.call({ principalAmountCents: 500 })).status === 409);
  f.intent.amount = 110; assert((await f.call()).status === 409);
  f.intent.amount = 160; f.intent.metadata.pricing_version = '1'; assert((await f.call()).status === 409);
});
Deno.test('invalid amounts never call Stripe', async () => {
  for (const principalAmountCents of [0,99,100001,100.5,'100']) {
    const f = fixture(); assert((await f.call({ principalAmountCents })).status === 400); assert(f.createCount === 0);
  }
});
