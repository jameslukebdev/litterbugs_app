# Isolated payout readiness checks

Scope: preparatory tests only. No payment, payout, account, eligibility,
international coverage, fee, legal-policy or production behavior change.

Run `npm run payout:readiness:test`. The root check command includes it.
The harness transpiles and executes the existing Edge Function TypeScript,
replacing Stripe, Supabase and environment boundaries with explicit fixtures.
It does not expose networking or real SDK clients. Transpilation is not semantic
type checking; run the normal backend checks separately.

## Covered behavior

- Actual recipient state classification: both active capabilities required;
  missing/pending/restricted capabilities; user requirements and duplicate copy.
- Actual maintenance handler: disabled payments; cached ineligible account;
  capability webhook refresh followed by a fixture retry; processor rejection;
  transient error retry retaining the same idempotency key.
- Actual webhook/signature-mode helper: bank outcomes, duplicate and out-of-order
  events, a paid event followed by a failed event, unknown account, and rejection
  of a live event signed through the test-secret fallback.

Signature verification itself is mocked, not cryptographically established by
these fixtures. SQL claims/state transitions and Stripe calls are also mocked;
these are handler tests, not end-to-end provider or live database evidence.

## Confirmed gap, not implemented reconciliation

Current bank payout events are recorded as processed but do not update cleaner
readiness or bank status. The tests characterize this limitation, not acceptance
criteria for completed bank reconciliation. An unknown account is also recorded,
without mutating known cleaner state. Existing duplicate detection will skip
previously processed bank events on replay, so future ingestion needs an explicit
backfill plan instead of simply replaying through the unchanged handler.

Stripe's connected-bank payouts can aggregate funds. A $15 bank payout fixture
does not establish delivery of any particular $5 cleanup transfer. Preserve the
distinction between reward transferred to Stripe and bank payout status.

Stripe documents `payout.created`, `payout.updated`, `payout.paid`, and
`payout.failed`, with v1 events also applying to Accounts v2. Connected events
identify their account in the top-level `account` field:
https://docs.stripe.com/connect/payouts-connected-accounts
https://docs.stripe.com/connect/webhooks

Stale cached eligibility is not refreshed by the payout worker itself. A known
ineligible account blocks; an eligible cache proceeds to the processor, and
permanent processor rejection records failure. Capability events can refresh
the cache; the fixture models the next SQL claim as a new attempt. Bank failures
currently do not perform this refresh. Do not claim the tests prove production
webhook subscription, timely receipt, bank delivery, or an automatic recovery.

## Approval gates retained

International eligibility, pooled-contribution/funding approval, reserve route,
country coverage, currencies, fees/minimums and recipient reuse remain pending
Stripe's account-specific decision. No country list or production scaffold was
added. Support stays with the parent task, and the hourly check stays paused.
No new terms, live money testing, financial accounts or app-store deployment.

Next implementation proposal: separate account-scoped bank event observations,
owner-visible failures and an explicit replay/backfill plan, plus verified
connected-account event scope. Do not silently reinterpret unknown/aggregated
bank events as cleanup transfer results. That production change remains a
  separate review; no implementation expansion occurred here.

## Validation

- New isolated handler/classifier suite: 12 tests passed.
- Existing mobile payout tests: four files, 19 tests passed.
- Existing funded-cleanup backend tests: 19 tests passed with no network or
  database/financial-operation permissions granted to the test runtime.
- Deno semantic type check passed for onboarding, Stripe webhook and financial
  maintenance using the frozen dependency lock. Dependencies were downloaded
  through supported network access into an isolated temporary cache/checkout.
- Targeted Deno lint passed for both new JavaScript modules. Only require-await
  is explicitly suppressed for deliberate asynchronous fixture boundaries.
- Node syntax checks and git diff whitespace check passed.

Full repository check, live event subscription, live database/processor tests,
builds and deployments were not run for this test-only slice. Original checkout
and contributor files were preserved. Remote main was freshly checked through
supported network access before the scoped branch push.
