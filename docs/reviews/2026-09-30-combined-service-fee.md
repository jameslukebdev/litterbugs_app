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

## Current build 14 — single service fee amount

Release source: `a4d9be14b500a0be14f8c244c7d7a9f73da289a4` (PR 97), including
all current mobile fixes and the owner's final copy correction. Customer-facing
surfaces show one fee amount; internal pricing math is unchanged.

- iOS EAS `8c10d921-3798-481c-8404-8a150f6102d4`, version 2.0.0/build 14,
  [signed IPA](https://expo.dev/artifacts/eas/M9ajYy3zB9kurusDQtznN77edzG3LTkY2r7eniIG3OU.ipa).
  SHA-256 `862dac55eb37658ce4b1c20a2c881297163a6a7d51cb415a22ae9f28ae8b76dc`.
  Strict/deep signature validation passed. Packaged bundle
  `5cb397f9b429d5836668753bd22f04fac40b2671bc0dc8cc0dd2b94323c76f44` contains
  the production backend and plain service-fee label, excludes local backend
  URLs, and contains no fee formula. Apple accepted TestFlight submission
  `c6476e08-eff7-4d10-87ab-37f004f04083`. App Store Connect reports build 14
  `VALID` and `IN_BETA_TESTING` (internal); external state is
  `READY_FOR_BETA_SUBMISSION`. Uploaded September 30 at 20:54:02 UTC.
  Build 13 was not submitted. No App Review/public release was submitted.
- Android EAS `eff3ef5b-dcad-4433-ba70-2d51426f6b3b`, same release source,
  version 2.0.0/code 14: remote build underway.
- Updated website deployment `litterbugs-d9rg0h5mz-grant-9890s-projects.vercel.app`
  is Ready. HTTP checks verify Terms/Cleanup Policy show one fee and omit the
  internal formula. The custom domain has not been promoted.

## Earlier signed mobile artifacts (build 13, superseded)

Both artifacts are version 2.0.0 / build or version code 13, production profile,
source `09510ce` (subsequent merged commits change backend handling, rollout SQL,
and documentation; the mobile/shared source remains identical).

| Platform | EAS build | Artifact |
| --- | --- | --- |
| iOS | `603b8847-b0b9-422b-9d5a-90e30b9d6cce` | [IPA](https://expo.dev/artifacts/eas/nTp9kSn_h28p-V4rXE44u_BP8vmWem42kwml8VIRM3g.ipa) |
| Android | `4575907f-cbf3-4185-ae92-7f5cd1270244` | [AAB](https://expo.dev/artifacts/eas/0uivsekcC5woK7AuXAEdE0pFyG43voJu-wC4d03wyUc.aab) |

- iOS SHA-256: `798d3ddc656da516fc317cf8fe93aa0fc6c3eac0a667900797890905e72ba882`.
  Strict deep code-signature verification passed; bundle `com.litterbugs.app`,
  Luke's team `DB39U76V6Q`, production push, and non-debug signing verified.
- Android SHA-256: `690bad21c362bf6076c1d147f6a6e137e59201e83eb9d30d90742573a903c5c2`.
  Bundletool validation and JAR signature verification passed. The upload
  certificate SHA-256 matches the previous production release
  (`2C:0A:31:66:6C:8C:7A:35:04:E9:0D:8E:B8:15:01:67:30:75:40:11:2F:96:90:51:B0:36:AB:13:C1:B0:AA:0E`). Jarsigner emits
  standard self-signed/no-timestamp and ZIP stream-order warnings; validation
  succeeds. Manifest package is `com.litterbugs.app`, code 13.
- Both packaged bundles contain the combined-fee copy, server confirmation,
  and production Supabase hostname, and exclude the local test URL.
- Grant explicitly authorized TestFlight upload after finishing verification:
  “finish testing the change and make sure iit works. Then go ahjead and upload
  to testflighjt”. This supersedes the earlier Luke-only distribution restriction
  for this TestFlight upload. Remaining testing must pass first; no repeated
  upload approval is needed. App Review and public store release remain excluded.

## Rollback procedure

Do not revert the schema or edit existing contribution amounts. Pause new
payments with the existing payments feature flag if urgent. The version-aware
backend must remain deployed for recovery and refunds. Switching config back
to version 1 permits legacy new checkouts and rejects version-2 new checkouts;
restore matching client presentation before doing that. Stored version-2
payments keep their full original charge and refund amounts.

## Deployment state

[PR 92](https://github.com/jameslukebdev/litterbugs_app/pull/92) is merged into
main; PRs 96 and 97 add the pricing-lock correction and single-amount fee copy.
Current release source is `a4d9be14b500a0be14f8c244c7d7a9f73da289a4`. All four compatibility/permissions
migrations and create-cleanup-contribution,
check-contribution-status, and stripe-webhook are deployed. Production pricing
is still version 1; no existing contribution was repriced. The tested website
candidate is `https://litterbugs-d9rg0h5mz-grant-9890s-projects.vercel.app`;
it contains the single-amount service-fee wording and $22.50 example.

Internal TestFlight distribution is complete. Public mobile distribution,
website promotion, and final pricing activation remain pending. The public
App Store still serves version 1.0/build 4. Keep those coordinated: old mobile versions will reject new checkouts
once version 2 is active. Existing pending payments remain recoverable.

Activation is prepared in
`supabase/rollout/20260930193000_activate_combined_service_fee.sql`; it has not
been applied to production.

## Fresh native verification and resource limits

Grant authorized temporarily stopping the default Colima VM. Both native device
checks subsequently passed, one device at a time, against an isolated native
PostgreSQL 17/PostgREST/Deno backend and real Litterbugs Stripe sandbox. The
backend uses the actual payment handlers and database roles. Authentication is a
synthetic test-user fixture; this is not a new production login acceptance test.

The native backend exposed a real regression: after restricting config writes,
`SELECT ... FOR SHARE` needed a privilege service_role no longer held. PR 96
introduces `private.lock_cleanup_pricing_version()`, a narrowly scoped definer
function available only to service_role. It preserves the activation lock without
granting pricing-config writes. Migration
`20260930202000_fix_cleanup_pricing_lock_permissions.sql` is deployed. Expanded
SQL tests fail before the fix and pass afterward locally and in a production
rollback transaction, including NEW service-role reservations for both pricing
versions and denied config writes/helper calls by ordinary roles.

- Fresh iOS simulator archive EAS `04e8d4a6-5c7a-44bf-82bc-d1ae1a28d1a4`,
  current native dependencies, separate QA ID and isolated backend bundle:
  $1,000 preview = $1,100.50; $1.05 preview/server confirmation = $1.66.
  Cancel/retry reused contribution `0122dcc5-a948-4f14-8801-c838e250876d` and
  intent `pi_3ULU58KUBoEpySr60WxDPC0S`. Native PaymentSheet displayed an
  insufficient-funds decline, then succeeded with a Stripe test card. The receipt
  showed $1.05 principal and $1.66 total. Status recovery confirmed success and
  only $1.05 was added to the reward.
- Fresh Android QA APK EAS `1737e187-dca6-495f-a290-f07de40f42c1`, package
  `com.litterbugs.app.qa`, version 2.0.0/code 1, installed on API 36. APK SHA-256
  `7b9fc6d972fdc5e4d8d4b1e67c1ab71d7d84eadb2e27a411c6dea8c88ae091c1`.
  It uses `http://10.0.2.2:62421`, excludes production backend, and contains all
  payment fixes. $1 preview/server confirmation = $1.60; cancellation/retry
  reused contribution `ee57f5e2-dfd2-45a1-be36-9a13bc0a0e22` and intent
  `pi_3ULUGqKUBoEpySr60lD6wRod`. Native PaymentSheet succeeded and the receipt
  showed $1 principal/$1.60 total. Server recovery confirmed principal-only
  funding. The earlier misconfigured QA build `9c0b7446` was never used.
- Both device payments were fully refunded in the sandbox, including their
  service fees, and reconciled to `refunded`: iOS refund
  `re_3ULU58KUBoEpySr60uVBg1cS` ($1.66); Android
  `re_3ULUGqKUBoEpySr60erWwxrF` ($1.60). Earlier browser/iOS fixture payments
  were also refunded; the final unpaid wording-check reservation was canceled.
- Native backend integration additionally passed rounding, maximum, legacy
  preservation, concurrent duplicates, decline/retry, duplicate webhook,
  cancellation, principal-only rewards, and full refunds.

After these payment tests, Grant requested that customers see only one fee
amount, with no internal formula. PR 97 removes the formula from app/web
previews, server confirmations, Terms and Cleanup Policy, retaining all dollar
amounts and unchanged calculations. The seven existing checkout component tests
and 163-module mobile source check pass. The latest merged source was rebundled
into the fresh iOS native shell and visibly verified: “Cleanup contribution:
$1.00 / Service fee: $0.60 / Total payment: $1.60.” The preview likewise shows
only “Service fee.” Bundle SHA-256:
`867e1940a4cd1e1dc280eb145a9ae02bfe880e9a82d18d70e83085e59d943407`.
This final copy-only check is distinct from the full native payment tests above.
Evidence: `~/Library/Caches/litterbugs-payment-audit/evidence/ios-service-fee-single-label.png`.

No concurrent emulators or native builds ran. Android guest RAM was 1 GB with one
CPU. A guard watched critical pressure, low reclaimable memory, rapid pageouts,
and a bounded test window. All device-test processes and the native local
backend are now stopped, temporary Stripe/auth credential copies removed, and
both emulators and the dedicated audit VM are off. The default 3 GB Colima VM
was restored with all six retirement-launch-local containers running (five
health checks healthy; PostgREST has no health check). Docker context is back to
`colima`; memory pressure was normal after restoration.
