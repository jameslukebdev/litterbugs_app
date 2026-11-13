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
- Separate temporary SDK-check variants reused the original native modules with a test-only JS entry. Both completed $1 sandbox card payments using the app's actual PaymentSheet configuration helper. Both test payments were refunded in the sandbox and the disposable Connect account removed. Both received a scheduled local notification and returned `Map` from the actual notification-destination helper after a physical notification tap. No server push token registered; no production account sign-in, real money or app database writes. This is native SDK/local-notification coverage, not a live APNs/FCM server-push acceptance claim.
- Fresh sandbox Connect onboarding rendered on both iPhone and Pixel. Initial failures were short-lived fixture sessions expiring during packaging (120-second claim window), not evidence of an app regression. Production creates sessions on demand and refreshes on SDK request.
- Stripe0.72 native builds passed. Expo doctor17/18 retains its known version warning versus Expo54's recommended0.50.3; the intentional embedded-Connect upgrade was preserved. Official0.72 already contains the old NSInteger fix; obsolete patch removed and four remaining native patches verified. A temporary Android test repack initially omitted META-INF Kotlin service resources; the untouched production AAB contains them, and the corrected test copy passed. No Kotlin or production dependency change was needed.

## Deployed prerequisites

- Website source `5c32ab8`, based on exact live privacy commit `4d4e2e8`; only media/legal changes included. Deployment `dpl_6HFe4Af232YP6LiQjUPDw3pWKkhg` promoted to `https://litterbugs.app`. Real synthetic image passed malware, Google content review, reconstruction and promotion through that exact candidate. Disposable auth account/photos removed. Privacy/Terms effectiveNovember13, including separate optional account-linked nearby area storage. Owner dashboard remains local/excluded.
- Cloud Run source `ace4313`, revision `litterbugs-gemini-relay-00006-cuz`, photo-content-20261113 tag only. Canonical funding review retains100% traffic on00004-rxr; new revision has0% default traffic. Website server env points to the pinned tag and reuses existing shared secret. Direct401/400/200 checks passed.
- Supabase `create-cleaner-onboarding-link` v33 adds mobile return-target support; `send-cleanup-notifications` v25 uses topic preferences. Applied and recorded `20261112150000_notification_preferences_and_nearby_alerts.sql` and `20261112160000_reporter_payout_waiting_notification.sql`. Nearby alerts start OFF; production readback found0 opted-in members. No manual push dispatch or financial movement.
- Existing PostHog project695338 has replay and exception autocapture enabled; existing IP discard retained. GeoIP enrichment still requires coarse-location analytics disclosure. Website explicitly keeps its own PostHog replay/exception options off; Clarity unchanged. Limited symbol-upload credentials are production EAS secrets; production upload flag enabled.

## Release handoff and verification limits

- Final media enforcement is complete. The owner confirmed older direct-upload builds were unused development versions and authorized closure. Source `13dc98f`, migration `20261113170000_enforce_sanitized_media_outputs.sql`, applied and recorded in production. All four final-bucket insert/update policies are gone; only private draft/quarantine client writes remain, and final buckets accept JPEG only. Live disposable-user tests denied direct report, cleanup and avatar uploads plus avatar replacement, while both new Google and released-client legacy avatar processing succeeded. Test files/accounts removed. Exact rollback was verified locally inside a rolled-back transaction.
- Actual payout identity/bank submission is not simulated as passed by the SDK harness. After initially skipping further phone testing, the owner made the Pixel available again. Real Expo/FCM delivery and notification tap passed in an isolated native-module copy; see the follow-up below. This does not certify the full production notification queue or production iOS APNs delivery. Original phone apps/data were preserved.
- Grant's App Store Connect admin access is verified for app6757313862 under James Luke Barber. Luke accepted the agreement; refreshed UI allowed creation of2.1.0, now Prepare for Submission. Release notes,2.1 review instructions and support/marketing URLs were saved and verified after reload. Privacy-policy URL is saved as https://litterbugs.app/privacy for the next version. Existing iPhone assets (seven inherited thumbnails) and three iPad screenshots are present. Manual release stays selected; no build attached/uploaded and Add for Review was not clicked. The data-type wizard still ends in immediate Publish; no privacy-label draft is saved. Reviewed16-type answers stay local pending release, per Apple's current-version rule. [Latest store handoff](2026-09-11-store-privacy-handoff.md#november-13-follow-up-agreement-cleared-and210-version-draft-saved) records exact state and review-access limitation. Grant's personal developer settings/sign-in account remain untouched. Google Play's disclosures cover analytics; retain approximate location.
- Apple authorization-revocation integration and separate-user Facebook login remain owner-excluded, not passed. Store submission is withheld.

## Cleanup and final state

Temporary SDK-check apps were uninstalled; original phone apps/data preserved. Staff device analytics choices remain OFF, while production build defaults remain ON. Temporary test credentials/files were removed. Local notification database and Colima were stopped with data/backup preserved; Docker context restored to default. Metro8081 is retained for the existing QA client. No store submission, GitHub push or OTA publication.

## Resource management during final store preparation

No new native build or simulator was started. A single-worker push-only JS export
used a768MB heap limit, then exited; temporary source and unused APK/bundle copies
were removed after the owner skipped phone testing. Memory-free readings were53%,
57%, then41%; free disk was6.1GiB then5.9GiB before final cleanup. The already-running
simulator's older2.0.1 QA shell showed a host keychain error, so it was not used as
2.1 screenshot evidence or treated as a reproduced2.1 device failure. Existing
phone release evidence and original candidates remain unchanged.

## Reviewer login and Pixel remote push follow-up

Owner explicitly approved creating a dedicated standard review login and saving
its email/password in Apple's private App Review fields. Created
`app-review-210@litterbugs.app`, user `3f455759-11f0-4387-bf0f-244e7852038e`, with
server marker `app_metadata.review_account=true`. Password sign-in and the member's
own profile read passed through the production app's anon-key Auth/Data API. Email
is confirmed, role is authenticated, admin membership count is0; verification
sessions signed out globally. No personal Apple identity or admin access granted.
Apple's2.1 draft now has Sign-in required checked, credentials entered and updated
access instructions; reload confirmed saved/masked fields and disabled Save.
Apple masks credential reads, so exact secret readback is not claimed. Local
plaintext password copy was removed after saving; no password is in source/logs.
Evidence: `artifacts/mobile-2.1.0/device-evidence/reviewer-login-verification.json`
and `apple-review-login-saved.jpg`. Full physical UI login with this new account
was not performed; this verifies Auth, profile availability and store-field save.

The owner then made the Pixel available again. A disposable
`com.litterbugs.pqa` copy reused native/resource bytes from the2.1.0(24) acceptance
APK;95 dex/native/resource/service entries matched exactly. Only test package/
provider authorities, updates configuration, signing and a push-only JS entry
changed. Analytics was never initialized, no account sign-in or database push-token
registration occurred. The Expo token request explicitly used production app ID
`com.litterbugs.app` with project `df0d0855-71d9-4943-b278-d1f083ab6b06`, allowing
existing production FCM credentials to deliver to the isolated test installation.

- Backgrounded test copy received “Litterbugs release test” / clearly labeled
  synthetic text. No cleanup, payment or other member notification was generated.
- Expo ticket `01a1d64b-b70f-735d-804f-8fd26550f519` and FCM delivery receipt both
  returned status ok. Native notification tray showed the exact test title/body.
- Physical tap reopened the test copy and called the actual release helper with
  eventType nearby_reports_daily, returning App > Map / showNearby true.
- This proves remote transport, receipt and tap/helper handling with the release
  native modules; the full production App navigator and business queue were not
  invoked by this push harness. Existing database queue tests remain separate.
- Evidence: `remote-push-verification.json`, `pixel-remote-push-opened.png` under
  `artifacts/mobile-2.1.0/device-evidence`. Test copy uninstalled; temporary APKs,
  bundle, entry source, token, phone XML and private UI dumps removed. Original
  com.litterbugs.app and com.litterbugs.app.qa apps/data retained.

Dashboard chat received the review-account UUID/marker for exclusion from real
member metrics; no password sent. No deployment, migration, push-provider setting,
GitHub push, OTA, store build upload or review submission. Manual release remains
selected. Privacy-label publication stays coordinated with actual2.1 release.
