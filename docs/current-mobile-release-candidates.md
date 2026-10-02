# Current Mobile Release Candidates

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
