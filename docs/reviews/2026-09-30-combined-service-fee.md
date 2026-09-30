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
  email is stored only while the intent is unattached so retry parameters do not
  change, then automatically cleared on attachment or contributor anonymization.
- Existing PaymentIntents are retrieved, never recreated. A reservation with no
  attached intent older than 23 hours stops for support review, avoiding a new
  charge after Stripe's idempotency retention expires.
- Older clients cannot start a new version-2 payment; they receive an explicit
  refresh/update message before Stripe creation. Existing version-1 payments
  retain their original amounts, including retries and refunds.
- Web and native confirmation display server-returned amounts. Report previews,
  fee help, payment history/detail, refund text, Terms and Cleanup Policy agree.
- No contribution creates no fee. Cleaner reward remains principal only.

## Verification

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
- Final privilege verification caught Supabase default write grants on the new
  config table. A follow-up migration explicitly revokes service-role writes;
  regression assertions verify service read access and deny update/delete.

## Stripe sandbox and client evidence

All test charges used Litterbugs sandbox `acct_1U2HaBKUBoEpySr6` and an isolated
local database. No production contribution or real charge was created.

- Actual PaymentIntents verified totals of $1.60, $1.64, $1.66, $6.06, and
  $1,100.50 for principals of $1, $1.04, $1.05, $5.05, and $1,000.
- Legacy intent `pi_3ULSh6KUBoEpySr602MAvBIE` retained its $5.50 total after
  activation. New legacy requests returned the refresh/update message.
- Concurrent HTTP requests returned one contribution and one PaymentIntent.
- Intent `pi_3ULSh7KUBoEpySr618PkIAsh` first declined for insufficient funds,
  then succeeded for $1.60. Status recovery finalized it without waiting for a
  webhook; duplicate signed webhook delivery was harmless. Reward was exactly $1.
- Full refund `re_3ULSh7KUBoEpySr61qHjYKYv` returned all $1.60 and reconciled to
  `refunded`. Provider cancellation also reconciled correctly.
- Browser checkout paid $1.60 using Stripe's real test card form
  (`pi_3ULSg3KUBoEpySr6115Ze15x`). Payments > Check payment status confirmed
  receipt; payment details showed $1 principal and $0.60 service fee. Narrow
  390px layout was inspected. $1.05 and $1,000 previews matched server math.
- iOS Release simulator app used the current JS bundle with a separate QA bundle
  ID and local test account. Server confirmation showed $5 + $1 = $6. Cancel
  and retry reused `pi_3ULSkuKUBoEpySr61QJDqTMZ`; native Stripe PaymentSheet
  succeeded and displayed “$5.00 was added ... total charge was $6.00.”
- Local browser Google Maps rejected the localhost:3101 referrer; report lists
  and payments worked. Fixture photos intentionally had no stored image. These
  were test-environment limitations, not production map/photo regressions.
- Live Stripe settlement remains Manual payouts. September's inspected fees
  view showed card/Link processing fees and no Connect/payout fee rows; this
  does not establish that future payouts are free.

## Signed mobile artifacts

Both artifacts are version 2.0.0 / build or version code 13, production profile,
source `09510ce` (the later commit changes only database privacy handling).

| Platform | EAS build | Artifact |
| --- | --- | --- |
| iOS | `603b8847-b0b9-422b-9d5a-90e30b9d6cce` | [IPA](https://expo.dev/artifacts/eas/nTp9kSn_h28p-V4rXE44u_BP8vmWem42kwml8VIRM3g.ipa) |
| Android | `4575907f-cbf3-4185-ae92-7f5cd1270244` | [AAB](https://expo.dev/artifacts/eas/0uivsekcC5woK7AuXAEdE0pFyG43voJu-wC4d03wyUc.aab) |

- iOS SHA-256: `798d3ddc656da516fc317cf8fe93aa0fc6c3eac0a667900797890905e72ba882`.
  Strict deep code-signature verification passed; bundle `com.litterbugs.app`,
  Luke's team `DB39U76V6Q`, production push, and non-debug signing verified.
- Android SHA-256: `690bad21c362bf6076c1d147f6a6e137e59201e83eb9d30d90742573a903c5c2`.
  Bundletool validation and JAR signature verification passed. Jarsigner emits
  standard self-signed/no-timestamp and ZIP stream-order warnings; validation
  succeeds. Manifest package is `com.litterbugs.app`, code 13.
- Both packaged bundles contain the combined-fee copy, server confirmation,
  and production Supabase hostname, and exclude the local test URL.
- TestFlight upload is awaiting explicit owner direction under the existing
  mobile-distribution instruction. No App Review or public store release.

## Rollback procedure

Do not revert the schema or edit existing contribution amounts. Pause new
payments with the existing payments feature flag if urgent. The version-aware
backend must remain deployed for recovery and refunds. Switching config back
to version 1 permits legacy new checkouts and rejects version-2 new checkouts;
restore matching client presentation before doing that. Stored version-2
payments keep their full original charge and refund amounts.

## Deployment state

All three compatibility/permissions migrations and create-cleanup-contribution,
check-contribution-status, and stripe-webhook are deployed. Production pricing
is still version 1; no existing contribution was repriced. The tested website
candidate is `https://litterbugs-hz4v5boe8-grant-9890s-projects.vercel.app`;
its Terms route returns the new fee and $22.50 example.

Native distribution, website promotion, and final pricing activation remain
pending. Keep those coordinated: old mobile versions will reject new checkouts
once version 2 is active. Existing pending payments remain recoverable.

Activation is prepared in
`supabase/rollout/20260930193000_activate_combined_service_fee.sql`; it has not
been applied to production.

## Source freshness and test resource limits

A fresh fetch confirmed latest GitHub main is
`f480c8e33a3682c5ec081562bdf448e732c98346`. It is an ancestor of signed-build
source `09510ce5c9a73f4c950f4809752b5ee1e2f2a8ca`; all 300 tracked mobile/shared
files exactly match the tested working source. Recent notification, photo-upload,
cleanup, and other main-branch fixes are included. EAS archives exclude generated
native folders and regenerate native projects. A fresh full iOS simulator build
`04e8d4a6-5c7a-44bf-82bc-d1ae1a28d1a4` is being built to replace the initially
reused native simulator shell; its mobile source is identical.

The owner's 16 GB Mac must not run concurrent device-test stacks. Idle emulators,
web servers, and the dedicated audit VM were stopped; memory pressure was normal
and free-memory percentage increased from 39% to 59%. Remaining local Android
compilation uses one worker, a 1 GB Java heap, and a guard that stops that build
if macOS memory pressure leaves normal. Run only one emulator at a time and stop
the dedicated audit VM after testing. Leave other projects' processes untouched.
