# Combined service fee rollout — September 30, 2026

Owner objective: keep $1–$1,000 contribution principal, add one service fee of
10% plus $0.50 per checkout, preserve existing payments, and roll out across
mobile, web, Edge Functions, and database. Store publication is separate.

## Economics checked

Read-only inspection of the live Litterbugs Stripe account
`acct_1U2HZe40KMkUKMFW` confirmed:

- $1.10 payment `pi_3UDFYc40KMkUKMFW0C9guG1s`: $0.33 processing, $0.77 net.
  With $1 owed to the cleaner, the old service fee leaves a $0.23 loss.
- $5.50 payment `pi_3UJcJO40KMkUKMFW13LW7KiL`: $0.46 processing, $5.04 net.
  With $5 owed to the cleaner, the old service fee leaves $0.04.

These observed charges match rounded 2.9% + $0.30 processing. At that rate the
new $1.60 and $6.00 payments leave $0.25 and $0.53 after principal and processing.
This excludes payout/Connect costs, refunds, disputes, and operating costs.
Stripe retains original processing fees after refunds. Do not represent this
change as guaranteeing a profitable cleanup or as changing bank payout timing.

## Implementation and compatibility

- Version 1 is the original rounded 10%; version 2 adds 50 cents after rounding.
- `cleanup_pricing_config` is service-readable and operator-writable only.
  Migration initializes version 1. Activation is a separate config update.
- Each contribution stores immutable principal, fee, total, and pricing version.
  The quote is reserved under an advisory lock before creating a PaymentIntent.
- Stripe creation uses the reservation ID as its stable idempotency key. Receipt
  email is stored with the quote so retry parameters do not change.
- Existing PaymentIntents are retrieved, never recreated. A reservation with no
  attached intent older than 23 hours stops for support review, avoiding a new
  charge after Stripe's idempotency retention expires.
- Older clients cannot start a new version-2 payment; they receive an explicit
  refresh/update message before Stripe creation. Existing version-1 payments
  retain their original amounts, including retries and refunds.
- Web and native confirmation display server-returned amounts. Report previews,
  fee help, payment history/detail, refund text, Terms and Cleanup Policy agree.
- No contribution creates no fee. Cleaner reward remains principal only.

## Verified so far

- Migration and service-fee transaction tests pass in the isolated local database
  and in a rollback-only transaction against production.
- Cases cover $1, $1.04/$1.05 rounding boundary, $5, $5.05, $1,000, invalid amounts,
  legacy retry across activation, duplicate reservation, mismatched identities,
  immutable amounts, rollback, principal-only funding, full-fee refund, and RPC
  authorization.
- 18 production contributions have the same before/after amounts/reference digest:
  `f055a84bf46744249bdca593f955290d`. No existing contribution was repriced.
- Edge tests cover reservation-before-Stripe, duplicate/concurrent HTTP requests,
  declined-payment retry, canceled/submitted payment handling, interruption after
  Stripe creation, old PaymentIntent retrieval after 24 hours, mismatched Stripe
  metadata/amounts, and old-client rejection.
- Existing JS tests: mobile 462, web 196, contract 14 passed; three additional
  web tests verify server-returned v1/v2 confirmation and update-required errors.
- Typecheck, web lint/build, mobile source check, and web boundary check passed.
- Production security advisors show no new findings.

## Rollback procedure

Do not revert the schema or edit existing contribution amounts. Pause new
payments with the existing payments feature flag if urgent. The version-aware
backend must remain deployed for recovery and refunds. Switching config back
to version 1 permits legacy new checkouts and rejects version-2 new checkouts;
restore matching client presentation before doing that. Stored version-2
payments keep their full original charge and refund amounts.

## Deployment state

Compatibility migration and create-cleanup-contribution, check-contribution-status,
and stripe-webhook are deployed. Version 2 is not yet active. Native release
artifacts, browser/native validation, sandbox integration, and activation remain
in progress; this document will be updated with their concrete results.
