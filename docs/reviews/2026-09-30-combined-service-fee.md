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

[PR 92](https://github.com/jameslukebdev/litterbugs_app/pull/92) is merged into
main `91712a601b17edf392fb64b5bd3ca58d2b95afb5`. All three compatibility/permissions
migrations and create-cleanup-contribution,
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

At implementation start, a fresh fetch confirmed GitHub main was
`f480c8e33a3682c5ec081562bdf448e732c98346`. It is an ancestor of signed-build
source `09510ce5c9a73f4c950f4809752b5ee1e2f2a8ca`; all 300 tracked mobile/shared
files exactly match the tested working source. Recent notification, photo-upload,
cleanup, and other main-branch fixes are included. EAS archives exclude generated
native folders and regenerate native projects. A subsequent fetch verified main
`059fba38a76ab792d5f27268ecee16c9624b3d3a`; its mobile/shared tree also matches
signed source `09510ce` exactly.

A fresh full [iOS simulator archive](https://expo.dev/artifacts/eas/jZYjpgiN2cWY4bvsSBg2KgLR_vEYrxm_7jq-Zdv_Clo.tar.gz),
EAS `04e8d4a6-5c7a-44bf-82bc-d1ae1a28d1a4`, finished from source `4ff5bcb`
(the mobile code is identical). Archive SHA-256:
`cce96a0f0e0ddc8584fe613038ca0723deb79f92a9b28d61025260820da55834`.
The simulator profile packages version 2.0.0/build 1; the **store IPA is build 13**.
Its unchanged production JS hash is
`572957fcdf03149b331eb014378eb0a9e16c31423412ebeee422128c6a8ad23f`.
The additional fresh-simulator runtime check was interrupted by the memory guard
and is **not passed**. Earlier successful iOS payment tests used the same current
mobile source with the previously built native shell.

Android QA build `9c0b7446-555c-443e-b245-5a387d5ad3db` finished, but binary
inspection found that it retained the production backend despite the requested
sandbox environment override. It was **not installed or used for payment tests**
and must not be used as the sandbox build. Its signature verified; package is
`com.litterbugs.app.qa`, version 2.0.0/code 1, and SHA-256 is
`0022828ec06100b7873e9cd4144d7663e14e7feaa4994d4488b47d8eec25ade1`.

Replacement QA build `1737e187-dca6-495f-a290-f07de40f42c1` finished remotely
from merged main `91712a6`, with explicit temporary local-backend literals in the
Supabase client configuration, the QA package, and cleartext access to the
emulator's local backend. All temporary source/profile settings were restored
after upload. The [replacement APK](https://expo.dev/artifacts/eas/ZCl9sY0O_5Bz0HYxciIvUfmDCY93zkjSVoTicd4b6HE.apk)
passed static verification:

- APK SHA-256: `7b9fc6d972fdc5e4d8d4b1e67c1ab71d7d84eadb2e27a411c6dea8c88ae091c1`.
- JavaScript bundle SHA-256: `8f235511c6814e9addec84e8fc1bab90cbae45fcca056c2b0fcea74026058f8b`.
- Package `com.litterbugs.app.qa`, version 2.0.0/code 1; APK signature verifies.
- Packaged JavaScript contains `http://10.0.2.2:62421`, excludes the production
  Supabase hostname, and contains the combined-fee and confirmation copy.
- Android manifest enables cleartext traffic for this local sandbox build.

It has **not been installed or run**. Native runtime/payment checks remain
pending because local device testing is stopped for memory safety. Neither QA
build is for distribution; the production AAB/code 13 remains the verified
release file.

The owner's 16 GB Mac must not run concurrent device-test stacks. Idle emulators,
web servers, and the dedicated audit VM were stopped; memory pressure was normal
and free-memory percentage increased from 39% to 59%. The local Android
build was limited to one worker and a 1 GB Java heap. The guard detected elevated
memory pressure and stopped its entire process tree. Subsequent isolated VM and
simulator startup also triggered the guard, so **all local device testing is now
stopped**; do not automatically repeat these heavy tests under the same workload.
The dedicated audit VM and both emulators are off, Litterbugs web/payment test
servers are stopped, generated native build settings are restored, and temporary
Stripe key copies are removed. Other projects were left running. Memory pressure
returned to normal. Additional fresh-device checks remain unfinished until enough
resources are available; do not report them as passed.
