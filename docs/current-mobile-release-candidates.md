# Current Mobile Release Candidates

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
