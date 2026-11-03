# Current Mobile Release Candidates

## October 30 — current store status checked

Google Play Console production Releases shows **21 (2.0.1)** as **Available on
Google Play**, released October 29. This supersedes the submission-only status
below. Apple’s public US listing still shows **2.0.0**, dated October 6.
App Store Connect redirected to sign-in, so the private submission/review status
of iOS **2.0.1 (24)** could not be verified. The public listing does not establish
whether Luke has submitted a pending update. No new submission or account change
was made during this read-only check.

## October 29 — Google Play build 21 submitted; Apple handoff prepared

At the owner's explicit request, Android **21 (2.0.1)** was uploaded and submitted
for production review. Play Console confirmed **“1 change sent for review”** and
listed only **Production → 21 (2.0.1) → Start full rollout** under **Changes in review**.
Automated quick checks were still running at confirmation (up to 14 minutes).
This is a submission confirmation, not Google approval or a live-release claim.
Existing country targeting and 100% rollout were preserved. Managed publishing
remains off, so approval automatically releases the update.

Current policy status showed no policy issues; App content had no declarations
needing attention. The existing reviewer username/password entry and instructions
were present and preserved; reviewer authentication was not retested here.
Bundle validation had no blocking errors and one nonblocking deobfuscation-file
warning. Supported-device counts showed zero devices lost from release 18.
The older DEX optimization notice for release 18 remains due February 2027;
it was not a blocking validation error for build 21.

Two browser file-chooser uploads failed generically; selecting the identical AAB
through Chrome's native file picker succeeded. The uploaded local SHA-256 was
`7991df183117ccd70ae32cb9afb8680f5996c9b7f4c2c8c050c452b5a8f83b94`.
Memory available was 37% during submission.

Apple **2.0.1 (24)** remains unsubmitted. The signed existing-team IPA and
Transporter/App Store Connect instructions are packaged in
`artifacts/mobile-2.0.1/submission-2026-10-29/luke-ios-handoff.txt` for Grant to send
Luke. The handoff email was subsequently sent at the owner’s explicit request from
`gegibson@icloud.com` to `jameslukeb.evj@gmail.com`; Apple Mail confirmed it in
Sent. The connected Resend key could not send from `admin@litterbugs.app`, so the
owner-authorized iCloud alternative was used. No admin-domain email configuration
or Apple account/credential was changed. Receipt: `luke-ios-email-sent.png` in the
submission evidence folder.
No production OTA was published.

Submission evidence:
`artifacts/mobile-2.0.1/submission-2026-10-29/google-play-build-21-submitted.png`
and `google-play-submission.json` in the same folder.

## October 29 — final release candidates verified

Version **2.0.1** has fresh release artifacts containing the final payout UI
changes and native OTA support. These supersede Android 20 and iOS 23 below.
At verification time, no store submission or production OTA publication had been performed. See the Google Play submission record above for the subsequent authorized submission.

| Platform | EAS build | Build | Artifact |
| --- | --- | --- | --- |
| Android | `431906ac-098d-4a0c-be84-e4fbeac29dda` | 21 | `artifacts/mobile-2.0.1/litterbugs-2.0.1-android-21.aab` |
| iOS | `0b2601ba-c68d-4568-936d-8301fc6db5d7` | 24 | `artifacts/mobile-2.0.1/litterbugs-2.0.1-ios-24.ipa` |

Both archives passed integrity, embedded final payout-copy, version/package,
production backend, runtime `2.0.1`, enabled-update and production-channel checks.
The Android bundle validated and its signature matched the existing production
certificate. The iOS IPA passed strict code-signature and existing-team
provisioning checks. Existing credentials were frozen and reused.

The mobile suite passed 515 tests with one opt-in skip; 171 source modules had
zero validation errors. An APK generated from the exact new Android AAB, with
identical JavaScript payload, passed fresh install, embedded launch, guest
profile/help, back navigation and background/resume assertions. The freshly
built iOS simulator app passed map, profile/help, embedded launch, back and
background/resume checks; its installed executable matched the downloaded
artifact. Simulator job `d4c9f21f-d3f5-4af9-a441-2185a2fd00ec` reports remote
build 24, while its simulator-only Xcode bundle number is 1; the actual store
IPA independently verifies build 24. The preceding native payout-state and real
sandbox browser acceptance remains recorded below. Fresh-binary smoke did not
impersonate a member or complete live payout onboarding.

The locally signed Android test APK produced a Maps authorization warning.
A separate production-identity check confirmed rendered Maps and zero
authorization warnings in the production-signed version 20 test app. The new
AAB 21 has the exact same Maps API key, package and signing certificate.
[Google documents package/certificate restrictions for Android Maps keys](https://developers.google.com/maps/documentation/android-sdk/get-api-key).
This establishes authorization for that release identity; it is distinct from
claiming a direct production-signed APK 21 installation. The exact build-21
payload was tested separately. A supplemental signed-APK job
`28b87874-bcea-4584-8c96-0b020fe5d0bd` was canceled once no longer needed.
The added `production-acceptance-android` profile supports future full signed
APK checks without incrementing the remote version or changing other profiles.

The Android release fingerprint matches APK 20, which passed actual remote
OTA delivery. A separate fresh iOS OTA pass on the new simulator binary
downloaded and launched update `01a188cc-1c77-7b33-8044-62c51a4ac6dd`, group
`a55111bf-b56e-4d72-9007-fad8ba881883`, from `production-preview`. The Help screen
displayed `App update: 01a188cc`; the native executable remained unchanged,
with one successful remote launch and zero failures. No reinstall occurred. Source UI/runtime inputs
remained unchanged through the builds; afterward, only the acceptance profile
and its README instructions were added. All differences are documented in the
verification results. Minimum observed available memory was 30%, above the 15%
guard. Test devices are shut down and the disposable Android copy was removed.

Evidence: `artifacts/mobile-2.0.1/verification/final-release-2026-10-29/result.json`.
Real carrier SMS, final Stripe agreement/identity/bank submission and live funds
movement were not tested. Store ownership, disclosures and submission remain
separate release work. Android 21 satisfies the requirement to exceed the
owner's preview APK version code 20.

## October 29 — simulator/emulator payout usability pass

Nevan confirmed his current app now works. The additional native-device pass
used one device at a time: Android API 36 and iPhone 17 Pro / iOS 26.5.
Missing-information, pending-review, ready, and first-time eligibility states
were checked using the production payout screen with isolated status fixtures.
The Android native assertions passed; iOS accessibility/screenshot inspection
confirmed the same states and eligibility enabling/disabling.

The pass exposed three usability problems that are now corrected: the next
setup action preceded by a long information card, first-time instructions on
already-ready accounts, and “Set up payouts” wording during pending review.
The action now precedes explanatory content, ready accounts have a concise
review action, and pending accounts offer “Review payout setup” without a
duplicate introduction. These are JavaScript changes. The refreshed Android 21 and iOS 24 candidates
above now include them; the older 20/23 artifacts below predate this pass.
Android 21 exceeds the owner's preview version code 20.

Preview OTA group `0f08afb1-75b8-403e-a69c-27d4e8451dba` carries these changes.
Both actual native test apps downloaded and launched it without reinstalling:
Android `01a1886b-31ad-7732-b393-aafaab49c1eb` and iOS
`01a1886b-31ad-704a-bbb1-3d5a22d09883`. Android's installed APK retained its
verified SHA-256; iOS retained its native executable SHA-256 and recorded one
successful latest-update launch with zero failures. Neither production OTA nor
store submission occurred.

Real sandbox browser checks preserved Stripe verification across switching to
Messages and returning on both platforms. iOS used the actual Expo auth-session
call in the isolated screen and continued with Stripe's test code to the saved
review screen. Android used a small native host with the same corrected Custom
Tab flags; screenshots confirmed Messages foreground and the preserved Stripe
screen afterward. Android web accessibility assertions timed out, so that
browser result is based on visual evidence; advancement through its sandbox
code to final review was not confirmed. No final agreement, real identity/bank
submission, carrier SMS delivery, transfer, or payout was tested. Synthetic
screen states are distinct from an authenticated live-account end-to-end test.

The mobile suite passed 515 tests with one opt-in skip. Memory was sampled every
10 seconds; the minimum observed available percentage was 30%, above the 15%
guard. Both devices were shut down and the disposable Android copy removed;
existing emulator data was preserved. Evidence and exact limitations are in
`artifacts/mobile-2.0.1/verification/device-retest-2026-10-29/result.json`.

## October 28 — 2.0.1 payout guidance and verified OTA delivery

The final store artifacts are built and downloaded, including the full payout
flow follow-up below. Builds 19 (Android) and 22 (iOS) are superseded. Neither store submission nor
a production OTA deployment occurred. Existing 2.0.0 users need to install this
native release once before they can receive future compatible OTA fixes.

| Platform | EAS build | Version/build | Local artifact |
| --- | --- | --- | --- |
| Android | `43098872-35f2-422b-a683-01206e3c486c` | 2.0.1 / 20 | `artifacts/mobile-2.0.1/litterbugs-2.0.1-android-20.aab` |
| iOS | `96ec9ca1-9c95-4d16-b38e-4a34b9e599bd` | 2.0.1 / 23 | `artifacts/mobile-2.0.1/litterbugs-2.0.1-ios-23.ipa` |

### Owner's Android phone testing build

Installable APK: EAS `689f7bff-3413-40a6-a54b-7e21007c1203`, 2.0.1/code 20,
`production-internal`, package `com.litterbugs.app`, update channel
`production-preview`. It connects to the live Litterbugs backend and uses the
member's normal account. APK download:
https://expo.dev/artifacts/eas/EJLyAf1kZrTnjZVj6uHnjUGzXRwxEN4fykh7B7oKy2Q.apk .
The downloaded APK passed signature verification against the existing production
certificate, manifest/package/version/runtime checks, archive integrity, and
checks that the latest payout guidance is embedded. SHA-256 and native settings
are recorded in `artifacts/mobile-2.0.1/litterbugs-2.0.1-android-20.apk.json`.
It has not yet been installed on the owner's physical phone by this agent.

Before the eventual Google Play submission, create the final production Android
build with a version code **greater than 20**, so Play can replace this installed
testing-channel APK. The AAB 20 above remains a review artifact; no publication
is authorized or performed in this pass. iOS build 23 is unaffected by this
Android testing-distribution requirement.

Artifact SHA-256 values are recorded beside each file. Packaged native update
settings were inspected in the actual IPA and AAB: updates enabled, runtime
2.0.1, production channel, and the existing Litterbugs EAS update URL.
Both embedded bundles also contain the new saved-eligibility handling,
“Update payout details” action, and “What to expect” guidance.

Real OTA acceptance passed on an iOS simulator and Android API 36 emulator.
Each installed a native production-test build, downloaded the update, restarted,
and displayed the new Help screen's downloaded update ID. Native executable/APK
hashes stayed unchanged. The iOS update database recorded a successful remote
launch with zero failed launches. Test update group
`a5c25e67-8706-43c5-b9d3-066beaaab31b` was published only to
`production-preview`; the production branch remained empty. Test native builds
were iOS `55a6d576-1b85-4970-bf51-6d364d6ea890` and Android
`834732e4-59b2-4125-ac52-13a4e3d0c0fb`. Their channel differs from the store
artifacts intentionally. After these native builds, the packaging configuration
was limited to iOS/Android and Metro to two workers; the successful OTA export
uses those final settings.

The refreshed payout-flow OTA group
`959b6617-e2f6-4719-b550-f6db42027a61` was also published only to
`production-preview`. Its iOS update
`01a1857a-d3bf-7b32-82de-e5755db04401` was downloaded and launched successfully
on the same installed native binary without reinstalling; the Help screen
displayed `App update: 01a1857a`. Expo recorded one successful launch and zero
failed launches. Android delivery was verified with the preceding test group;
the refreshed Android bundle was exported and published, without another
emulator delivery run.

The full-flow review corrected the earlier diagnosis of Nevan's account. Live
Stripe showed **Enabled**, with active **Payouts** and **Transfers**. His SSN
last-four requirement was due only if volume reaches $3,000. The app's server
incorrectly treated every user-action requirement, including `eventually_due`,
as blocking. Readiness now follows Stripe's active capabilities, and future-only
requirements are excluded from the current missing-information list. Current
requirements remain actionable even while Stripe permits payouts. Restricted
or missing capabilities still block payouts.

Owner-requested account-specific confirmation also inspected Nevan's live v2
account data in Stripe: both recipient capabilities were active and the only
SSN requirement had `minimum_deadline.status = eventually_due`. Running the
downloaded deployed classifier on those exact non-identity fields returned
`enabled`, `payoutsEnabled: true`, and an empty current-requirements list. His
saved app record still held the old pending result, so the existing status-sync
RPC corrected that cache under a guarded transaction matching the user, Stripe
account, country, saved age confirmation and exact old SSN-only requirement.
The RPC only writes account status and has no table triggers. An independent
read after commit confirmed enabled/true, no current requirements, and saved
age confirmation. No Stripe requirement, identity, bank details or funds changed.
This verifies server readiness; his physical screen was not accessed.

Payout setup distinguishes missing information from pending review and shows
readable labels for legal name, agreement confirmation, identity, bank, and
reward-activity requirements. Existing saved age confirmation avoids another
checkbox when members resume. Enabled accounts needing current remediation
open the secure onboarding form through “Update payout details”; ready accounts
open payout details directly. The app explains that Stripe's “product
description” means the member's Litterbugs reward activity.

Android browser options now avoid the default NO_HISTORY task behavior. A native
regression test using the same corrected Custom Tab flags retained a synthetic
verification form and entered code after switching to Messages and returning via
the launcher. This is not a complete real Stripe SMS/identity/bank test.

Production `create-cleaner-onboarding-link` version 29 and `stripe-webhook`
version 27 contain the readiness correction. The webhook deployment preserved
the deployed handler and other dependencies; only its shared recipient-state
logic changed. Both deployed sources were downloaded again and matched their
reviewed staging copies. Authentication and webhook-signature guards still
reject unauthenticated/unsigned requests.

New individual recipients receive this activity description, without a platform
website: “Individual participation in litter reporting and community cleanups
coordinated through Litterbugs. Litterbugs pays rewards for eligible, verified
activity.” Existing member-provided profiles and entity types are preserved.
Exact legacy platform values are corrected where readable; a redacted profile
is updated only when Stripe explicitly reports a missing activity-description
requirement. Real sandbox migration verified the old platform URL was removed
and the website requirement satisfied by the activity description.

Hosted onboarding was exercised with synthetic data through contact/SMS,
personal details, bank selection, manual test-bank entry, optional Link saving,
and final review. Returning to the configured test callback and opening a fresh
link resumed directly at review with name and bank intact. The final agreement
was left unsubmitted; actual API requirements correctly kept the account
restricted for the missing agreement and omitted future DOB/SSN thresholds.
No real bank, identity, charge, transfer, or payout was submitted. Native
physical-device completion remains unverified.

Stripe still displays “Product description” and business-oriented wording in
its hosted form, even with the field prefilled. The alternate recipient service
agreement was tested only in sandbox and explicitly rejected for US-platform →
US-recipient accounts. Financial Connections remains available with manual
entry as fallback; saving with Link is optional. Live and sandbox collection
settings request no optional balances, ownership or transaction data. No bank
collection settings, service agreements, fees or payout timing were changed.

Both the ladybug icon and full wordmark were saved in the live Stripe platform
and separate Connect onboarding branding settings, then reopened to verify
persistence. The same icon and wordmark were saved and reopened in sandbox
Connect branding. Both Connect previews use the ladybug in place of the generic
icon; Stripe chooses which saved asset appears in each hosted layout.

Source verification: 514 mobile tests passed, one opt-in test skipped; 171 native
modules validated. Four rendered-component tests cover first eligibility,
resuming a confirmed member, enabled-account remediation, and direct dashboard
access. Vitest now supports the app's JSX-in-JS screens and uses two workers by
default. Backend checks: 48 tests passed and affected functions typechecked.
Logs, screenshots, native
hashes and acceptance metadata are under
`artifacts/mobile-2.0.1/verification/`, with the full flow follow-up in
`artifacts/mobile-2.0.1/verification/connect-flow/`.

Memory was sampled throughout native acceptance; minimum available memory was
30% across the two passes, with no guard shutdown. iOS and Android ran sequentially. Both are now
stopped, and the disposable Android AVD was deleted to recover about 4.5 GiB.
Available memory rose to 48% afterward. Existing Apple/Facebook access exclusions
remain excluded, not passed. No Apple account settings were changed.

The later iOS OTA follow-up also shut its simulator down after verification.
The step-by-step audit notes, evidence limits, provider checks and screenshot
index are in `artifacts/mobile-2.0.1/verification/connect-flow/flow-audit.json`.

## October 2 — connected iPhone draft and map verification

The USB-connected iPhone 6s (iOS 15.8.8) retained sign-in through in-place QA
updates. Private synthetic report/photo handoff passed web → phone → web →
phone, including cold relaunch. The production PT409 correction now exposes
concurrent-edit conflict choices promptly; choosing the account draft restored
its title and photo on the phone.

The native map fixes preserve discovery pins after Resume draft → Close → Save
for later and use accurate “Keep your report?” guidance. Nearby reports now
cluster at a distance appropriate for the existing marker artwork. The map
keeps clustering enabled, uses maxZoom to reveal individual pins, and disables
unused spiral rendering. The clustering dependency now queries the controlled
viewport when it changes, including programmatic recentering that does not emit
a fresh native region-complete event on the tested phone.

Physical verification passed: four-report Boone group → smaller group →
individual reports → Re-center → restored four-report group. Reopening the
synced private photo draft and saving it preserved that group. All 475 native
tests passed (one opt-in integration test skipped); 168 native modules validated.
The real-PostgREST conflict integration separately passed earlier in this pass.

QA identity: `com.gegibson.litterbugs.qa`, using the existing development signing
setup. To limit Mac memory use, the final candidate reuses the compiled QA
native binary and replaces its JavaScript/assets through Expo export and Hermes,
then re-signs and passes strict signature verification. The final one-worker
bundle peaked at 507.5 MB RSS with normal system memory pressure throughout.
Installed candidate: `/tmp/litterbugs-oct2-clustering-qa/Litterbugs.app`.
JavaScript SHA-256:
`7868405f1feb6f2c106e9a4a488e7ad8d0329bed2ed65f193694b0eeaed473fe`.

These native changes are **not in TestFlight build 17** and have not been
submitted. Build 17 remains the latest internal TestFlight release. The shared
server conflict correction and website startup-search correction are live.
These checks do not certify every map flashing scenario, production push,
native camera/HEIC capture, or physical cleanup-draft handoff. No public report,
cleanup claim, payment, or personal photo upload occurred.

## October 1 — notification read behavior follow-up

The current source leaves foreground notifications unread when displayed or
dismissed with Later. Opening an update or choosing Mark read acknowledges only
the displayed IDs. Funding-approved alerts no longer navigate automatically.
Historical unread events no longer overwrite the current map task status;
the map refreshes authoritative report data before showing the prompt.

Validation: 470 native tests passed (one opt-in integration test skipped),
168 native modules validated, and iOS/Android Hermes exports succeeded.
Physical-device notification acceptance remains unverified. A fresh October 1
device inventory still reports the paired iPhone unavailable. A fresh Apple
status check now confirms build 17 is VALID / IN_BETA_TESTING. Availability
in TestFlight does not establish installation or physical-device acceptance.

The earlier signed iOS 2.0.0/build 16 candidate completed in EAS job
`66c6ed7a-a26a-43e6-9da8-bf9d19f41038`, source `1f9aaed`.
Its bundle/version and code signature were verified. It contains the shared
draft-confirmation safeguards but predates these notification changes.
Build 16 was not submitted to TestFlight. The release containing this follow-up
is iOS 2.0.0/build 17,
source `77d4721f006f5dc7e1afc5a7b2874df12e961000`, EAS job
`46240c2e-0953-47a3-8b48-6e4087e5d664`. It finished October 1 at
10:08 p.m. EDT. The downloaded artifact identifies `com.litterbugs.app`,
version 2.0.0/build 17, and passes strict code-signature verification.
EAS submission `296eee67-c6f7-49df-b091-8eed572ba94c` completed. Apple confirms
`VALID` / `IN_BETA_TESTING`, uploaded October 1 at 10:28 p.m. EDT. Build 17
is available to the existing internal TestFlight setup. No new tester groups,
external beta review, or public App Store release were submitted. The public
store version remains 1.0/build 4. Physical phone/web handoff remains unverified.

## October 1 — customer web/app sync and map stability

**Apple accepted iOS 2.0.0/build 15 and it is available for internal TestFlight testing** (`VALID`, `IN_BETA_TESTING`). It supersedes build 14 for customer draft/photo sync, favorites/hidden reports, refresh behavior, historical rewards and reduced map marker motion.

- Source: `8370e5cf64346355c8cdd6d82a8e16120044f9b6`.
- EAS build: `5a85bae2-0b95-4a8b-90b6-c30384fa5bfe` (finished).
- EAS submission: `985b3f4e-6e87-4fda-82e6-9c66f096bf84` (finished).
- [TestFlight](https://appstoreconnect.apple.com/apps/6757313862/testflight/ios).
- The compatible website and three additive backend migrations are live. Build 15 uses the shared version-1 draft format. The later shared draft-sync safeguards in PR106 are **not included in build 15**: unchanged local drafts now recheck the account record before confirming sync, and confirmation records retain actual expiry. A future native build is required to distribute those safeguards. Production pricing remains version 1.
- Native unit tests, both native Hermes exports and isolated native draft-adapter integration passed. This pass did not perform a physical-device walkthrough of build 15 or a new live financial transaction. Android source/export is updated; no new Android store binary or Play submission was requested in this TestFlight-focused pass.
- No external beta review or public App Store release was submitted. Existing Apple-revocation/separate-Facebook limitations remain excluded, not passed.

See [release evidence and indexing status](reviews/2026-10-01-web-parity-implementation.md).

October 1 compatibility follow-up: the current native source passes 465 tests
(one integration test intentionally excluded from the default run), all 31
shared-contract tests, and validation of 167 native modules. The explicitly
enabled loopback integration test separately passed using the real native draft
adapter and PostgreSQL RLS: restore browser-format photo bytes, sync a native
edit, detect a newer browser edit despite unchanged local contents, preserve the
account revision, explicitly restore the account version and its photo bytes,
then discard. Auth/Storage transport and Expo filesystem/crypto are fixture
adapters, so this is not a physical TestFlight acceptance claim. The paired
physical iPhone was unavailable. No new native build or submission was made in
this verification follow-up; build 15 remains the installed-release reference.

## September 30 — single-amount service fee release

Release source `a4d9be14b500a0be14f8c244c7d7a9f73da289a4` includes all current
fixes plus the owner's correction: customers see “Service fee” and one dollar
amount, without the internal formula. Version 2.0.0/build 14 supersedes the earlier build 13 candidates.

**Apple accepted iOS build 14 and it is available for internal TestFlight testing**
(`VALID`, `IN_BETA_TESTING`). EAS build
`8c10d921-3798-481c-8404-8a150f6102d4`, submission
`c6476e08-eff7-4d10-87ab-37f004f04083`.
[Open TestFlight](https://appstoreconnect.apple.com/apps/6757313862/testflight/ios).
External beta review/App Review/public release were not submitted. Android
production build `eff3ef5b-dcad-4433-ba70-2d51426f6b3b` is finished and verified:
[signed AAB, version 2.0.0/code 14](https://expo.dev/artifacts/eas/Ft7t_UY1mJ3JckqCcv-FgK2CdVQJH0TRTfAJJjvQtuU.aab).
Its package, existing upload certificate, bundle structure, production backend,
and single-amount fee copy pass verification. It has not been submitted to Play.

Fresh iOS and Android native Stripe sandbox payments passed; server-confirmed
amounts, cancellation/retry, principal-only rewards, and full refunds were
verified. The final copy-only change was separately verified in the current iOS
simulator bundle and web component tests. Both emulators and local test servers
are stopped; the temporarily stopped retirement backend has been restored.

Grant explicitly closed this task at TestFlight on September 30: “no, just
finish with testflight.” Testing and TestFlight delivery are complete. Public
store release, website promotion, and pricing activation are excluded from this
completed task; do not reopen them as blockers or request publication approval.
Production pricing remains version 1.

See [the rollout evidence and rollback procedure](reviews/2026-09-30-combined-service-fee.md).

## September 28 — verified iPhone update and fresh iOS build 12

The connected iPhone now has the current Release QA app from main `abfb3fa`,
including PRs 87 and 88. Completion notifications reached the phone and opened
Luke's completed Ridge Road cleanup; admin notifications opened the protected
admin sign-in page. Three existing report photos were prepared, uploaded, and
safety-checked in **11.441 seconds** in a private Wi-Fi test. All test report/photo
objects were removed and the normal app was restored with Grant's account intact.

The fresh [signed iOS IPA, version 2.0.0 / build 12](https://expo.dev/artifacts/eas/mw5S80KEXrHBRf4IVonyvEsMvrB68f2knhRPuxaOnMI.ipa)
is finished and verified. EAS build `2e5875c5-dec1-4c4f-ab02-00a40e4da63d` uses
Luke's existing credentials. **Grant explicitly authorized the TestFlight upload
on September 28, and Apple accepted build 12.** EAS submission
`e64f819c-f5fc-426c-8cb8-e91bc657f19c` completed successfully; Apple processing and
tester availability were not yet confirmed. No App Review or public release was
submitted. Check [TestFlight](https://appstoreconnect.apple.com/apps/6757313862/testflight/ios)
for version 2.0.0 (12). This supersedes build 11 for
iOS; the September 24 Android artifacts below remain older than PRs 87 and 88.

See [device evidence, timing limits, artifact hashes, and Luke's release checks](reviews/2026-09-28-iphone-notifications-photo-verification.md).


## Earlier September 28 follow-up — source handoff (superseded for iOS above)

A fresh native build is required for the latest changes on
`codex/cleanup-notifications-speed`: contributor/admin notification navigation,
continuous two-photo upload scheduling, immediate progress, single-pass resizing
when dimensions are known, a three-second foreground wait for a saved cleanup's
review, and automatic refresh of a pending mobile review screen. No native build
or TestFlight upload was produced in this follow-up. Luke owns distribution.

The notification backend is deployed separately. Already-completed Ridge Road
requires no further approval, and historical completion notices are not backfilled.
See [the investigation and verification steps](reviews/2026-09-28-ridge-road-investigation.md#follow-up-contributor-alerts-and-photo-submission-latency).


## September 28 — cleanup approval source update

[PR 87](https://github.com/jameslukebdev/litterbugs_app/pull/87) removes routine
first-paid holds, suppresses draft-generated rejection alerts, opens the report
from funding notices instead of checkout, and corrects review messages. The
database migration and notification service are deployed. Ridge Road's routine
hold is cleared with an audit entry; its evidence and $5 contribution are intact.
Luke can reopen and approve that existing cleanup using his current app.

The mobile notification-routing and message fixes require a fresh native build
from main containing PR 87. The September 24 IPA/build 11 and Android/code 12
below predate those client fixes. No new native artifact or store submission was
made in this pass. Luke should use his existing production build/distribution
process, increment the build number, and install the new TestFlight build before
checking the updated notification route. App identifiers, icons, EAS profiles,
and signing configuration were unchanged.

Acceptance steps and evidence: [September 28 investigation and rollout](reviews/2026-09-28-ridge-road-investigation.md).

## Deployment handoff to Luke — September 24

The owner clarified that “push live” means push the completed fixes to GitHub main. Luke will deploy through his developer account. Do not interpret that wording as authorization for Codex to submit or publish either mobile app.

Use the September 24 artifacts below, which include the reporting, waiver, and reliable link-sharing fixes. The older artifacts in the historical section are superseded. All implementation changes are merged through PR 83; PR 84 records signed-artifact and Android link verification.

- **iOS:** the current signed IPA is version 2.0.0/build 11 on Luke's existing team. To include automatic Universal Links, enable Associated Domains for the existing `com.litterbugs.app` App ID, refresh its provisioning profile, set `ENABLE_IOS_ASSOCIATED_DOMAINS=true` in the intended EAS build profile, and build a new IPA. The current IPA cannot gain that entitlement through a JavaScript update. Verify an HTTPS report link from Messages or Notes on the newly signed installation. Until then, the website's explicit Open in Litterbugs button remains the tested handoff.
- **Android:** the current AAB/APK are version 2.0.0/code 12. If Google Play uses a separate app-signing certificate, register that certificate for the production Maps configuration and website Digital Asset Links before release. The current checks use the existing EAS signing certificate.
- **GPS:** both current clients use the fresh-location publication RPC. Apply `supabase/rollout/20260923215000_enforce_report_location_after_client_release.sql` only after compatible clients are distributed; the switch blocks the old direct-publication path. A GitHub push or a QA installation alone does not satisfy this gate.
- **International payouts:** leave existing country eligibility unchanged until Stripe resolves case `sco_VJarfjNbi0QKE3`. The 120-country expansion is not enabled.

During the clarification, an iOS 2.0.0 draft was created in App Store Connect. EAS upload attempt `ba5c4446-92b1-4f7c-b75e-aa498fc72fd4` was canceled, with cancellation confirmed by EAS. No App Review submission or store release was performed. The unpublished version draft remains for Luke; no Google Play app was created.

## September 24, 2026 — current source and build refresh

The current source is main `5fe4a07e87d923cc8a356273d125ac518fe7fac9` (through PR 83). Older artifacts below predate the reporting and sharing changes and must not be described as current release candidates.

The connected iPhone has a freshly built Release QA app with the native changes through PR 82. Messages link previews, Copy, the documented Instagram Link-sticker workflow, and live Safari-to-app report handoff passed. See [physical-device evidence](reviews/2026-09-24-physical-iphone-share-verification.md). This QA install is not an App Store distribution.

Fresh production builds use an isolated checkout of the exact main revision and existing frozen credentials; no signing settings, Apple account configuration, or store submission were changed.

| Platform / artifact | EAS build | Version | Verification status |
| --- | --- | --- | --- |
| Android production AAB | `cfa748ef-1979-4d85-a555-8238fa038e93` | 2.0.0 / code 12 | Finished; bundle, signature, manifest, and production Maps configuration verified |
| Android installable APK | `448b0904-1b31-4e6d-b2f7-2b09d0d62fb7` | 2.0.0 / code 12 | Finished; signature, upgrade, native map, HTTPS report opening, and Share link verified on API 36 emulator |
| iOS production IPA | `5c519649-b68c-44af-a002-f79523f34634` | 2.0.0 / build 11 | Finished; signature, profile, version, and current sharing bundle verified |

The [signed iOS IPA](https://expo.dev/artifacts/eas/Sjx_4vsf-O5aJRz7pbHBTB6OsHblGdYKQtvdlADW9_0.ipa) finished on September 24 at 15:25 UTC. Its SHA256 is `61e9c253173c7263d6394001aad261d7212479dcf20fd0d3f384fb822fff33d1`. Deep/strict code-signature verification passes. The package is `com.litterbugs.app`, minimum iOS 15.1, signed for Luke's existing team `DB39U76V6Q` with a profile expiring August 20, 2027, production push, and no debugging entitlement. The packaged JavaScript contains the current Share link, Share photo, Link sticker instructions, and No contribution now wording. Its bundle SHA256 is `114f30bba07cc6d0f2fc18885b2f9f62d384f80d4ebd04df5212ed93454207a3`.

This is a store-distribution artifact, not the QA app installed on the connected iPhone. The production IPA still has no associated-domain entitlement; automatic iOS Universal Links are not enabled or verified. The physical QA device separately passed the website's explicit Open in Litterbugs handoff and sharing workflow described above.

The [Android AAB](https://expo.dev/artifacts/eas/PpGPqqvvDUKr8WR8F1w9sCt_EDuGkLutYyq9wPdOU9Y.aab) has SHA256 `e778ecc85f4e8cfe9f4e02c90f7870638f66757eb04275658fa2325c6bd9118d`. `bundletool validate` succeeds and `jarsigner` reports the bundle verified, with the existing self-signed/no-timestamp and ZIP-stream-order warnings. The [installable Android APK](https://expo.dev/artifacts/eas/xq050_2qZvJBsBRyhnlrp0tKMH2hfoST-Jy9LtrYm8M.apk) has SHA256 `76252077890e8872e0a96e4ffe94e79d58fe7582dc6017a30f525cc64e2084a5`; `apksigner verify` succeeds. Both retain the existing signing certificate SHA256 `2C:0A:31:66:6C:8C:7A:35:04:E9:0D:8E:B8:15:01:67:30:75:40:11:2F:96:90:51:B0:36:AB:13:C1:B0:AA:0E` and package `com.litterbugs.app`. The AAB is not debuggable, targets SDK 36 with minimum 24, and contains neither RECORD_AUDIO nor SYSTEM_ALERT_WINDOW. Decoded manifests from both finished artifacts pass `scripts/check-android-release-map.py` against the current EAS production environment.

The APK updated the existing API 36 emulator installation in place from 1.0.0/code 11 to 2.0.0/code 12. Android's original first-install timestamp remained September 1; no uninstall or data clear was performed. This was a guest-session smoke test, not a signed-in session-persistence test. Android still reports `litterbugs.app` verified. A cold HTTPS VIEW intent for report `ce154938-f7c9-40d9-99bc-4a5d43710aa0` selected `com.litterbugs.app/.MainActivity` and displayed the exact Howard's Creek report, its photos, and $6.00 reward. Share link opened Android's native Sharing link sheet containing exactly `https://litterbugs.app/reports/ce154938-f7c9-40d9-99bc-4a5d43710aa0`, without caption text. Cancel returned to the unchanged report. Closing the report showed rendered native Google Maps roads, place labels, and its $6 marker. No recipient/message, claim, payment, or agreement acceptance was submitted. Evidence is in `/tmp/litterbugs-sep24-release/android-report.png`, `android-system-share.png`, `android-map.png`, and their UI XML captures. These are emulator checks, not a new physical Android acceptance pass.

All three artifacts are current, verified build candidates. Store publication remains outside this task's authorization. Strict GPS direct-write enforcement remains deferred until compatible mobile clients are distributed; building or installing one QA device is not that distribution gate. International payouts remain gated by Stripe's account-specific response.

## Historical artifacts and verification (superseded)

> Debugging pass closed for controlled user testing. The physical Pixel startup comparison reached the map in about three seconds after the splash, without reproducing the emulator delay or flashing circle. The human spoken accessibility walkthrough was waived by the user. Store submission and Apple/Meta account work remain deferred. See the [closure record](reviews/2026-09-10-device-acceptance.md#debugging-pass-closure).

> Latest correction: use `litterbugs-production-maps-corrected-v11.aab` from the [device acceptance record](reviews/2026-09-10-device-acceptance.md#production-login-and-local-maps-build-correction--september-10-afternoon). The preceding local `ae59d05` AAB contained the QA Maps key and is superseded. The corrected production APK renders native map tiles, completes Google sign-in, resumes funding, and retains the account after updating/relaunching. The user waived the spoken accessibility walkthrough for this pass; Apple/Meta configuration remains deferred.

> September 10 physical-device acceptance: the connected Pixel 5 and iPhone 6s received current Release QA builds. Dense Android marker redraw, duplicate map controls and accessibility-label corrections are documented in [device acceptance](reviews/2026-09-10-device-acceptance.md). A fresh signed Android production review bundle from `ae59d05` is also recorded there, including all four ABIs and verified report links. Android notification delivery and report navigation now pass on the physical Pixel, with messaging credentials assigned to QA and production. The spoken screen-reader walkthrough is waived for this pass; Apple/Meta setup remains deferred and no store submission has been made.

> September 10 follow-up: `main` now includes the confirmed iPhone and Pixel fixes through `21e1207`. A new signed Android review bundle and rebuilt iPhone simulator were checked; the new bundle is **not ready for store submission** and predates the final Firebase configuration/Profile placeholder follow-up. See [release follow-up](reviews/2026-09-10-release-follow-up.md) for current artifacts, notification setup, and remaining gates. The older “store-ready” statements below are historical.

> September 9 readiness update: the signed artifacts below predate the September 8–9 workflow and polish changes. They are historical evidence, not candidates for submitting the current app. See [the pre-submission audit](reviews/2026-09-09-prestore-audit.md) for current verification and release gates. No new App Store submission has been made.

These builds contain the completed mobile fixes. The public Android bundle was
refreshed from `9cc1440d944d06cde16f035f3423338f5921198f`, which keeps Facebook
sign-in out of public releases until Meta review is complete. Internal mobile
profiles retain Facebook for invited-provider testing. No App Store or Google
Play submission was made.

## Android signed store-ready bundle

- EAS build: `fff735c5-7a15-4854-962f-ee0b6e7e0a4a`
- Status: finished
- Profile/distribution: `production` / store artifact, not uploaded
- Package/version: `com.litterbugs.app` / `1.0.0` (`10`)
- Minimum/target SDK: 24 / 36
- AAB SHA-256:
  `b7a50a8c92156a9e6f28785053c50c43295a395786b53f0dd7172d8ccad7dbf5`
- Upload-certificate SHA-1:
  `79:E6:D2:50:03:74:57:40:DE:02:EB:F9:8F:3A:20:1D:58:85:73:4C`
- Upload-certificate SHA-256:
  `2C:0A:31:66:6C:8C:7A:35:04:E9:0D:8E:B8:15:01:67:30:75:40:11:2F:96:90:51:B0:36:AB:13:C1:B0:AA:0E`
- `bundletool validate` passed and `jarsigner` verified every signed entry.
- The packaged manifest is not debuggable. `RECORD_AUDIO` and
  `SYSTEM_ALERT_WINDOW` are absent.
- The compiled public bundle contains neither the Facebook provider label nor
  its release-flag name. Google and email remain the public sign-in choices.
- The bundle is ready for the future first Play upload after the permanent
  account owner is chosen. It has not been uploaded or submitted.

## Android production-identity internal build

- EAS build: `d47cd626-9889-48cd-9560-bec5aba735fa`
- Status: finished
- Profile/distribution: `production-internal` / internal
- Package/version: `com.litterbugs.app` / `1.0.0` (`8`)
- Minimum/target SDK: 24 / 36
- APK SHA-256:
  `473205396c0f8010c6d90b778c25142e9e6c6eb723b483db28875fe9faaa86c1`
- Packaged permissions were inspected. Location, camera, photos, notifications,
  network, and required platform permissions are present; `RECORD_AUDIO` and
  `SYSTEM_ALERT_WINDOW` are absent.
- API 36 emulator smoke passed: cold launch, welcome, map-first discovery,
  production Google Map rendering, location permissions, reports list, guest
  profile, provider choices, email sign-in, and email account creation.
- No application crash or fatal React Native error occurred.

## iOS signed internal build

- EAS build: `6875bf03-7f8e-4227-9138-123b5f89974c`
- Status: finished
- Profile/distribution: `production-internal` / internal ad hoc
- Bundle/version: `com.litterbugs.app` / `1.0.0` (`6`)
- Minimum iOS version: 15.1
- IPA SHA-256:
  `ab687aa19a16f41b17dab779defcb00c773a072b1fbd8ea338c724fc472c8e51`
- Signing identity: `iPhone Distribution: James Luke Barber (DB39U76V6Q)`
- Team: `DB39U76V6Q`
- Provisioning profile: active through August 20, 2027
- Registered test device: `00008110-001E1C5C0AF8801E`
- Code signature is valid on disk and satisfies its designated requirement.
- Production push entitlement is present. Apple Pay and associated-domain
  entitlements are absent, matching the currently deferred features.
- Location, camera, and photo-library reasons are packaged; no microphone reason
  is present.

The ad hoc IPA is for the registered physical device and cannot be installed in
the iOS simulator.

## iOS production-environment simulator build

- EAS build: `add15b91-4218-4e56-8ab4-33b3c567eaf5`
- Status: finished
- Profile/distribution: `production-simulator` / internal
- Bundle/version: `com.litterbugs.app` / `1.0.0`
- Archive SHA-256:
  `2d285b953f0d3d43d75886ca105c861934c42a080f8d0d96fa762811c1e389ad`
- Installed and cold-launched successfully on an iPhone 17 Pro simulator.
- The signed-out welcome screen rendered with the current brand, readable text,
  intact safe-area spacing, and both primary actions visible without clipping.
- No application crash, unhandled JavaScript error, or fatal React Native error
  occurred during the smoke check.
- This simulator-only artifact is not a store submission candidate. The signed
  internal IPA above remains the production-identity iOS release candidate.

The current Android candidate received the broader navigation smoke because it
can be exercised completely without a physical Apple device. The iOS simulator
was shut down immediately after the focused check to avoid unnecessary memory
pressure.
