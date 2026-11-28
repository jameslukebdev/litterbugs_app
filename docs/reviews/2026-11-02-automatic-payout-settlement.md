# Automatic cleanup payout settlement — November 2, 2026

Owner authorized deploying automatic waiting/retries and resuming the approved $25 Greenwood Lot cleaner reward. No mobile build, store submission, payment-setting change, or new charge was performed.

## Live result

- Applied migration `20261102225153_automatic_cleanup_payout_settlement`.
- Deployed `run-financial-maintenance` v39 from a downloaded v38 production baseline plus the bounded payout change. Staging: `work/payout-settlement-release-20261102`. Existing function authentication configuration was preserved.
- Resumed cleanup `c89b35f2-df7b-4d24-8d57-932badce3416`, report `68256b51-06ad-4bf1-8e9f-a7a42e2e4631`, using the guarded, audited transaction in `2026-11-02-payout-settlement/resume-greenwood-reward.sql`.
- Scheduled maintenance returned HTTP 200 at `2026-11-02T22:57:00.110344Z` with payout result `waiting_funds` for that exact cleanup. This verifies the deployed worker can read Stripe balance and defer the real reward.
- Follow-up ledger: amount 2500 cents, payout status `pending`, payout attempts 2 (one original rejection, one new balance check), transfer null, next check `2026-11-02T23:02:01.99681Z`. No reward transfer was created during verification.
- Payout-failure case `9b6b289b-06ff-468f-ab50-03a2a855efec` resolved at `2026-11-02T22:56:30.300164Z`, with an owner-authorization action and financial audit. Zero open payout-failure cases remain for this cleanup.

## Behavior and safeguards

Fresh pooled-fund payouts check available USD card funds before transferring. Insufficient funds return the operation to `pending` with a five-minute retry delay and a readable waiting message, without a failure case or failure notification. A definite `balance_insufficient` rejection after a balance race uses the same waiting path. Exact single-charge transfers retain their existing charge-linked settlement behavior. Installed mobile clients already render `pending` as “Reward pending”; no new mobile status or app upload is required.

Queue claims use row locks with `skip locked` and respect the retry deadline. New claims require a completed, passed, paid cleanup without an open/upheld dispute, rejected admin decision, or existing transfer. Recovery preserves the same Stripe idempotency key. It bypasses the fresh balance precheck so a transfer that succeeded before an interrupted ledger update can still be reconciled even if it reduced the balance. Unknown/network/server errors remain uncertain rather than being requeued with a fresh key. After 23 hours of uncertainty the worker stops and requires review, before Stripe's minimum 24-hour key retention may expire. A stale waiting request cannot overwrite a newer attempt or a transferred reward.

The scheduled worker runs every minute; waiting rewards become eligible every five minutes. This is polling, not an instantaneous Stripe balance webhook. Payment completion still depends on enough usable balance and a ready recipient account. Account restrictions, holds, disputes, reversals, bank delivery, insufficient funding, and prolonged uncertain outcomes are not solved by this patch. No Stripe payout schedule or balance-reserve setting was changed. This release does not establish that future automatic bank payouts cannot reduce the available platform balance before a reward transfer.

## Verification

- 56 shared function tests passed, including eight new payout tests: pooled-fund waiting, settled-fund transfer, single-charge handling, balance race, interrupted-ledger recovery, uncertain response, expired idempotency protection, and disabled recipient.
- All existing Edge Function type checks passed; the production-derived staged function also passed its type check.
- Transaction-only database assertions passed against the deployed schema and rolled back: exclusive claims, cooldown, preserved recovery key, stale-worker protection, no failure notifications/cases while waiting, existing-transfer exclusion, evidence/dispute holds, and service-only permissions. `supabase/tests/cleanup_payout_settlement.sql` is explicitly wrapped in BEGIN/ROLLBACK and targets this owner-authorized unpaid reward; it is not a general-purpose test after this reward is paid.
- Security advisor reported no error-level issues before and after deployment.
- Live HTTP response plus ledger/case reconciliation verified automatic waiting. Actual settlement and final transfer remain future events; they are not recorded as passed here.
