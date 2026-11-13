# Mobile 2.1.0 release preparation — November 13, 2026

Owner instruction: finish release preparation; analytics ON by default; do not submit either store. No GitHub push or mobile OTA publication.

## Frozen candidates

Source `c34f5698b7c880e3392512206d8f588f0b846d8e` on local `codex/mobile-2.1.0-release-20261113`, isolated from dashboard and preview work. App changes correspond to main-branch `8ec516e`, plus the obsolete Stripe0.50.3 patch removal and archive exclusions. Native source did not change during device acceptance.

| Platform | Version | EAS build | Local original artifact | SHA-256 |
| --- | --- | --- | --- | --- |
| iOS |2.1.0 (27)|14f76fb5-40d9-4f3d-8c95-13489935ec7f|artifacts/mobile-2.1.0/litterbugs-2.1.0-ios-27.ipa|b41385e723d54da99201f418a91872e6102740c6d964dc2fcebc5ffd22180a53|
| Android |2.1.0 (24)|e6a72070-4f04-4626-afec-29e9956874be|artifacts/mobile-2.1.0/litterbugs-2.1.0-android-24.aab|2a9d57704b0ca46aeb950e87d5b5930ea54aa3115bd20755d4cd4f017cfc479a|

Both EAS jobs finished. Original artifacts retain production package `com.litterbugs.app`, analytics enabled/environment production, enabled Expo updates and production channel. iOS minimum15.1; Android minimum24/target36. Original signatures verified; Android AAB and acceptance APK match the existing signing certificate. No store submission, upload, GitHub push or OTA publish.

## Product changes

- Keeps the verified analytics, anonymous installation measurement, device-wide staff exclusion and default-on production behavior. No automatic analytics-permission popup. Private routes and exposed maps pause replay; masked replay can resume for safe screens and full-screen report sheets.
- Finalizes welcome accessibility sizing and confirmed-only contribution totals.
- Inline, unchecked photo-processing/Terms approval gates report review, cleanup review and newly selected profile photos. It resets when photos change. Profile edits without a new photo need no photo approval.
- Malware checking precedes metadata-free JPEG reconstruction and separate content review. Google Gemini reviews report/cleanup photos and approved new-mobile avatars; legacy avatars retain Cloudmersive basic NSFW classification. Google refuses sexual/nude, graphic gore and promotion of hate/violence; ordinary litter/hazards remain allowed. Errors, refusals, malformed output and timeouts keep photos private. Human reporting/blocking/moderation remain necessary; classification is not a guarantee that all prohibited content is detected.
- Existing Gemini funding/cleanup review policy is unchanged. The new fixed-purpose content endpoint has bounded JPEG/body limits and uses the existing server-only relay secret.

## Verification

- Mobile:619 passed,1 existing opt-in skip; lint and224-module source check passed. Media/helper tests40; relay10; Deno66. Local notification preference/nearby/dedup/reporter-readiness SQL checks passed and rolled back their fixtures.
- Isolated website:149 test files /1084 tests passed; TypeScript, scoped lint and production build passed.
- Original iOS Mach-O UUID `73D0F0A8-184B-3AB5-B21C-BAA90D27ED33` matches a valid uploaded PostHog dSYM set bound to `com.litterbugs.app/2.1.0+27`. Original Hermes debug ID `06eb3c61-9255-4b4e-a6ef-f9fe033cb908` has valid uploaded source maps.
- Android original Hermes debug ID `ec17a464-eee7-4c36-8fe9-b305a36d66e4` matches valid uploaded source maps.32 native symbol sets are valid/uploaded and bound to `com.litterbugs.app/2.1.0+24`; actual arm64 appmodules ELF build ID `04c6a60d1dee7eb26de1250dde44b6c9b7185eea` matches normalized symbol ref `0da6c604-ee1d-b27e-6de1-250dde44b6c9`. This proves symbol availability, not a current-production crash occurrence.
- Fresh physical iPhone6s/iOS15.8.8 QA copy retained original production native executable and JS bundle bytes; only test identity/config/signing differed. Welcome, sign-in/back, maps, reports/details, real/missing shared links, background/relaunch and analytics choice checked. Both initial CTAs fit the small screen. Its PostHog events carry namespace `com.gegibson.litterbugs.releaseqa`, environment `test`, build27 and embedded launch; these are QA traffic.
- Native replay session `01a1d581-9cd6-79d6-81cf-166be6217d38`: last pre-auth frame15:30:20.680Z; Auth15:30:21.789Z; frames resume15:30:35.083Z as Home returns. Last Home frame15:30:52.361Z precedes Map15:30:52.759Z; Reports15:31:33.852Z resumes frames15:31:34.124Z. Covered report details can record while route name remains Map. Native player visually verified text and report photos masked. Exposed-map gap is intentional.
- iPhone switch starts ON, switches OFF and remains OFF after native termination/relaunch. PostHog query returned zero events for that QA namespace after15:36:54Z while later journeys continued. Android fresh acceptance APK uses analytics disabled by build config; its separate device preference starts ON and persists OFF across native relaunch.
- Pixel5/Android14 acceptance APK `eaeef196-452e-4412-a8ba-6b411f6b0e1d`, version24, installed fresh beside the existing QA app. SHA-256 `b2d0755ce1506af697fd8174d0a85fabcbdbec22ade5679709f8a1c0143f1adb`. Google map/results, tour skip, Reports/details, missing link, guest funding/auth gate and saved analytics exclusion verified.
- Separate temporary SDK-check variants reused the original native modules with a test-only JS entry. Both completed $1 sandbox card payments using the app's actual PaymentSheet configuration helper. Both received a scheduled local notification and returned `Map` from the actual notification-destination helper after a physical notification tap. No server push token registered; no production account sign-in, real money or app database writes. This is native SDK/local-notification coverage, not a live APNs/FCM server-push acceptance claim.
- Fresh sandbox Connect onboarding rendered on both iPhone and Pixel. Initial failures were short-lived fixture sessions expiring during packaging (120-second claim window), not evidence of an app regression. Production creates sessions on demand and refreshes on SDK request.
- Stripe0.72 native builds passed. Expo doctor17/18 retains its known version warning versus Expo54's recommended0.50.3; the intentional embedded-Connect upgrade was preserved. Official0.72 already contains the old NSInteger fix; obsolete patch removed and four remaining native patches verified. A temporary Android test repack initially omitted META-INF Kotlin service resources; the untouched production AAB contains them, and the corrected test copy passed. No Kotlin or production dependency change was needed.

## Deployed prerequisites

- Website source `5c32ab8`, based on exact live privacy commit `4d4e2e8`; only media/legal changes included. Deployment `dpl_6HFe4Af232YP6LiQjUPDw3pWKkhg` promoted to `https://litterbugs.app`. Real synthetic image passed malware, Google content review, reconstruction and promotion through that exact candidate. Disposable auth account/photos removed. Privacy/Terms effectiveNovember13, including separate optional account-linked nearby area storage. Owner dashboard remains local/excluded.
- Cloud Run source `ace4313`, revision `litterbugs-gemini-relay-00006-cuz`, photo-content-20261113 tag only. Canonical funding review retains100% traffic on00004-rxr; new revision has0% default traffic. Website server env points to the pinned tag and reuses existing shared secret. Direct401/400/200 checks passed.
- Supabase `create-cleaner-onboarding-link` v33 adds mobile return-target support; `send-cleanup-notifications` v25 uses topic preferences. Applied and recorded `20261112150000_notification_preferences_and_nearby_alerts.sql` and `20261112160000_reporter_payout_waiting_notification.sql`. Nearby alerts start OFF; production readback found0 opted-in members. No manual push dispatch or financial movement.
- Existing PostHog project695338 has replay and exception autocapture enabled; existing IP discard retained. GeoIP enrichment still requires coarse-location analytics disclosure. Website explicitly keeps its own PostHog replay/exception options off; Clarity unchanged. Limited symbol-upload credentials are production EAS secrets; production upload flag enabled.

## Remaining release conditions

- Legacy direct-upload compatibility policies are still live. The committed final rollout explicitly requires retiring unsupported direct-upload clients first. Both current public stores are2.0.1 and use quarantine; pre-quarantine installations may remain. Final four-policy closure requires an owner support-version decision. Concrete rollback preserves the preceding policy/bucket definitions in `supabase/rollout/restore_legacy_media_outputs_20261113.sql`. Do not claim universal enforcement until closure is applied and checked.
- Actual payout identity/bank submission and live server-push delivery are not simulated as passed by the SDK harness. Current native component, sandbox card, local notification and shared-link checks are complete.
- Apple account-holder privacy/store forms remain prepared release work. Luke's unavailable account is not requested; Grant's Apple settings and only Apple sign-in account remain untouched. Google Play's existing disclosures cover analytics; retain approximate location. Optional account-linked nearby area processing is separately documented in the store handoff.
- Apple authorization-revocation integration and separate-user Facebook login remain owner-excluded, not passed. Store submission is withheld.
