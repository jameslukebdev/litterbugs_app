# Mobile 2.1.0 release preparation — November 13, 2026

Owner instruction, updated November13: upload and submit both refreshed builds for store review; keep public release manual. Analytics ON by default. No GitHub push or mobile OTA publication.

## Multi-size audit — local only, November13

Source `16582b9fc7cacd7248dfe8a09ab3eaabce0c3a14` fixes compact-screen tutorial overlap, exactly150%
text truncation of Report Litter, and selected pins obscured by search/card.
Short/large-text map previews reserve the pin and fixed grabber/X; content
scrolls inside. Dragging the fixed header dismisses even after content has
scrolled. Existing normal/larger styling and platform motion timings remain.

Native checks: physical iPhone6s375×667; existing iPhone17Pro simulator402×874
(default and accessibility-medium text); physical Pixel5 with temporary logical
displays320×568 (default/150% text),360×640 and412×915. These Android sizes
are virtual-display configurations on one Pixel, not separate phone models.
iPhone6s used current local JS/assets in the existing isolated27 native shell,
not a new store binary. Map/cards, tutorial, reports/details and profile/navigation
were inspected. Both physical phones passed scrolled-content→grabber dismissal;
X also closes. Pixel1080×2340/density440/font1.0 and simulator large text restored.

658 mobile tests pass/1 existing skip; scoped ESLint and225-module source check
pass. Evidence: `artifacts/mobile-2.1.0/device-evidence/screen-size-audit/audit.json`
and selected native screenshots. Existing Pixel draft preserved; no publication,
payment/funding/cleanup transaction or new authentication-integration claim.
Existing Apple-revocation/Facebook exclusions retained.

Owner explicitly held rebuild/replacement work to inspect sizes. No prior review
was canceled; no new build/upload/submission, OTA, deployment or push started.
Submitted iOS28/Android25 still lack the local follow-ups. Both refreshed store
binaries and their final artifact checks remain pending. Public release stays
manual; simulator remains open.

## Android report-card motion — local only, November13

Source `00e95d84d295d38964da02072cf149a22aa12cce` smooths Android map preview opening and closing. Waits for
native card layout; travel is the measured card height plus bottom/shadow
clearance, with native eased360ms entry/280ms exit. Card stays mounted through
exit, content updates do not restart entry, quick reopen reverses from current
position, and old exits cannot clear a newer selection. iPhone's original
240/180ms motion and full-screen distance remain unchanged; explicit regression
passes. No pin/camera behavior changes in this follow-up.

648 mobile tests pass/1 existing skip; scoped production lint and225-module
source check pass. Physical Pixel QA recordings show continuous up/down travel.
Owner confirmed “Yes, both directions feel smooth.” Local evidence:
`device-evidence/android-card-smooth.json`, `android-card-smooth-open.mp4` and
`android-card-smooth-close.mp4` under artifacts/mobile-2.1.0. No native build,
store upload/review change, OTA, deploy or push. Manual public release holds
retained; submitted iOS28/Android25 remain unchanged and lack local follow-ups.

## Android camera and prompt drop start — local only

Source `419f6377c1f912e27098df37948882ada3c59f6e` scopes camera corrections to Android's own map adapter.
Native gestures no longer echo camera positions back through a controlled region;
search/location requests still move the map. Android pins hide offscreen and
replay on return, starting during camera movement instead of waiting for the
map to settle. This shortens the delay before dropping; native fall520ms,
stagger60ms and first-image readiness100ms are unchanged. iPhone behavior stays
approved, with its original map component and all iPhone branches preserved.

642 mobile tests pass/1 existing skip; scoped lint and225-module source check
pass. Physical Pixel search, cluster zoom, panning/reentry and idle stability
checked. Owner confirmed “Yes, both feel right.” iPhone artwork/animation/card/
framing file hashes match the saved approved baseline; existing iPhone hook
regressions pass. Evidence: local device-evidence/android-map-rediscovery.json/mp4.

No native build, upload, review change, OTA, deploy or push. iPhone simulator stays
open. Existing submitted iOS28/Android25 remain unchanged, with manual public
release holds retained. Refreshed candidates are still needed to include local
follow-ups; no iOS rebuild/resubmission during this Android-only pass.

## Larger report controls; Hide removed — local only

Owner requested big, clearly visible favorite/share controls on iPhone and
Android. Source `f37328aee983c15e165d8456bb22eef8b23fe980` increases the detail
toolbar glyphs20→32 points and touch targets44→52, moves the two controls into
the space vacated by Hide, and keeps Back to map within its own width. Hide is
removed from the detail toolbar and report list's new-hide menu action. Existing
hidden preferences/filtering remain intact; already-hidden list items retain
Restore report so they are not stranded. No preference/database writes.

9 existing report presentation/loading/preference tests pass; scoped lint and
224-module source check pass. Simulator screenshot/AX confirm larger favorite/
share and no Hide control. No physical Android result claimed; shared code applies
to both platforms. Evidence: `device-evidence/large-report-toolbar.png` and
`large-report-toolbar.json` under the2.1 artifact folder. Local only; no native
build/upload, review changes, public release, OTA, deploy or GitHub push. Both
candidates need refresh to include this and the prior shared card follow-up.

## Shared report-card behavior and final polish — local only

Source `06fcdef4e95e3eabdb431af6fb099d241f6d73ac`, on top of iPhone re-entry
fix225a0be, preserves the existing Litterbugs photo, bug artwork, lilac edge,
funding/cleanup actions and card content. The owner requested faster iPhone pins
and shared swipe-down report cards, then refined the header appearance.

| Decision | Reference/constraint | Final behavior |
| --- | --- | --- |
| One continuous card | Owner screenshot/existing design; Google Maps sheet pattern | Photo top corners merge with header; unrelated hero callers retain their old style |
| Compact dismissal | Owner's X/grabber preference; circular controls reviewed in ElevenLabs |36-point header,3-point neutral grabber; final owner preference removes circle and preserves18-point X, centered vertically within header with44×44 hit target |
| Motion | Owner request; Refero motion guidance | Full-screen-height entry from bottom240ms, exit180ms; system reduced motion skips automatic movement |
| Short-phone access | Owner request; native bottom-sheet pattern | Fixed close remains outside ScrollView; downward pull from content top dismisses, normal content/horizontal scrolling and action taps retained |
| Faster arrivals | iPhone-only scope | Normal floating drop196+84=280ms, stagger25ms; AndroidStillMarker native520/60ms unchanged |

Research: existing screenshot/style is the primary reference lock. Reviewed
[Google Maps sheet](https://refero.design/screens/e2a89712-e762-4fe6-b3fb-edeb1568fe05),
[ElevenLabs control treatment](https://refero.design/screens/f49df7d6-3188-411e-bac1-c95dfc5b1eff)
and [Mapbox product framing](https://mapbox.com) through Refero; retained the
Litterbugs visual language rather than adopting their brand tokens. Bundled
motion/touch guidance informed short transitions and the44-point close target.

Verification: full mobile suite634 passed/1 existing skip. Final focused gesture,
content and landing checks22 passed after close focus-order/alignment refinements;
production component ESLint passes and224-module source check0 errors. Final
circle removal is cosmetic, same close callback and hit target. Gesture tests
cover both platform settings, small viewport, scrolling versus dismissal, short
pull cancellation, downward flick, content actions and reduced motion. No physical
Android result claimed. CUA verified the X returns to the map. Owner manually
confirmed “Yes, it dismisses cleanly” for the downward gesture. Simulator visual
review confirmed the final thinner grabber/plain centered X. Existing single-worker
Metro retained; no new simulator/native worker; free memory35% during full tests.

**Release follow-up:** these shared card changes are absent from both submitted
iOS28 and Android25; refresh both candidates before public release. Prior
readiness notes saying only iOS needs a refresh are superseded by this section.
Existing reviews and manual public-release settings unchanged. No build/upload,
OTA, deployment, production provider change or GitHub push. Apple privacy remains
complete. Evidence: `artifacts/mobile-2.1.0/device-evidence/report-card-final.png`
and `map-preview-motion-local.json`.

## Post-submission iPhone map correction — local only

Owner requested iPhone-only behavior: when a landed pin leaves the viewport and
returns, the old resting pin should stay hidden until a complete new drop starts.
Source `225a0bec528424fa241b81624961b77a9ea96db5` updates only the floating-landing
branch of usePinLandings (inPlace=false, used by iPhone). Off-screen pins are
hidden while panning, their visibility history cleared even within one continuous
swipe, and remain hidden while their new stand-in lands. Android inPlace=true
keeps its existing native marker/drop behavior. A generation guard stops a stale
140ms handover timer from deleting the next landing for the same pin.

Regression-first checks reproduced3 returning-pin failures, then a separate
quick-return cleanup failure. All6 hook tests now pass, including report/group
re-entry, a continuous out-and-back swipe, retained in-view pins, quick-return
cleanup and unchanged Android drop identity. Alongside map framing/marker tests:
12 focused tests pass. Hook ESLint passes;224-module mobile source check0 errors.
Existing ESLint configuration excludes test JSX; no test lint coverage claimed.

CUA taps reached the simulator, but repeated remote drags did not move the map.
Owner explicitly made it idle, then performed the actual swipe and confirmed:
“Yes, it now drops into an empty spot.” This is owner-observed simulator
acceptance of the hide/drop behavior, not an automated native gesture result.
The extra fast-return timer guard is covered by the regression test. No physical
Android retest/new native build/simulator was started. Existing Metro retained
(one worker/768MB heap, test analytics OFF); observed free memory38%.

**Release follow-up:** submitted iOS28 does not contain this newer local fix.
Include it in a refreshed iOS build before public release. Android25 and both
current store review submissions are unchanged; no upload, submission, OTA,
provider/backend setting, deploy or GitHub push. Apple privacy19 categories remain
complete and public release is still manual. Evidence:
`artifacts/mobile-2.1.0/device-evidence/iphone-pin-reentry-local-fix.json`.

## Latest candidates and submitted review — supersedes the original builds below

The owner-reported pin issue is fixed: Metro had stopped loading newly mounted
artwork in the existing simulator; restarting it restored the ladybug. Source
`eaa461a` changes only selected-pin height from30% to22% of the map to keep the
bug and pin tail above the report preview. Both pins were repeatedly selected;
two focused map-framing tests pass. Screenshot:
`artifacts/mobile-2.1.0/device-evidence/selected-pin-fixed.png`.

Frozen release source `7e4275b598cb37c1932294d451f3e110e171f7ff` contains that
one helper change over the previously accepted c34f569 source. Both new EAS jobs
finished. These originals supersede27/24:

| Platform | Version | EAS build | SHA-256 |
| --- | --- | --- | --- |
| iOS |2.1.0 (28)|a065e139-0a41-4aed-aea7-d18dc0382e62|e3632c74188b7dd1a49a88cb545065851a9b76c96575c58bc3a409f3a00ad9e6|
| Android |2.1.0 (25)|30f89079-7077-45ef-bd8b-dc7b88cef85c|6b1dfdf1efe0e310ad2764f0f180740bdf96a301061b88bb663a8a7bf6e85f82|

Original IPA/AAB are under `artifacts/mobile-2.1.0`. Both signatures verified;
Android signing certificate matches24. Package com.litterbugs.app, version2.1.0,
production analytics enabled; Android minimum24/target36 unchanged. iOS production
update channel/runtime2.1.0 verified. EAS retained symbol-upload configuration;
iOS native PostHog upload phase executed. The exact uploaded symbol UUID matches
listed below belong to27/24; refreshed28/25 UUID readback is not claimed.

- Apple EAS upload job0b131cee-2e1c-446f-b3bd-e823c2b80e49 finished. Build28 processed,
  attached and saved. Submit for Review completed at2:52PM ET; submission
  `2abda04e-5782-41bf-99ed-d2005198cc12` visibly **Waiting for Review** for2.1.0(28).
  **Manually release this version** remains selected. Dedicated standard review
  login, instructions, existing screenshots and updated policy URL retained.
- Google production draft4 accepted only25(2.1.0); previous21 is excluded.
  Validation: no blocking errors, one existing deobfuscation-file warning and
  zero lost supported devices. Production rollout/country settings preserved.
  At2:55PM ET, Send changes for review completed: Production25 and Data safety
  visibly appear under **Changes in review**, quick checks still running/up to
  14minutes. This confirms submission to Google's workflow, not approval or
  completion of its checks. **Managed publishing ON** holds approved changes.
- Google added Address, Phone number and Other info for embedded Stripe onboarding;
  existing analytics disclosures preserved. Apple privacy now has all19
  completed/published categories after the owner’s explicit follow-up instruction.
  The3:18PM verification below supersedes the earlier13-category baseline. Details in
  [store privacy handoff](2026-09-11-store-privacy-handoff.md#november13-submission-follow-up--current-baseline-corrected).
- No mobile public release, OTA, backend deployment or GitHub push in this pass.
  Dashboard chat received the review/manual-hold status; app metrics remain
  marked unreleased. Existing dashboard production deployment is separate work.

Before public release: store approvals, resolve any actual review feedback, then
obtain the owner’s explicit public-release instruction. Apple privacy details
are complete as of the3:18PM follow-up below. Apple revocation and separate Facebook tests remain
excluded, not passed; prior physical-notification limitations remain documented.

Evidence: `ios28-build-verification.json`, `android25-build-verification.json`,
`store-review-submissions-20261113.json`, `litterbugs-apple28-waiting-review.jpg`
in `artifacts/mobile-2.1.0/device-evidence`. Google's final accessibility state
showed Changes in review and Managed publishing on. Native file-picker upload
succeeded after the browser chooser returned a generic upload error. Memory
available42% at completion; cloud builds avoided new local native workers.
Metro8081 remains running with768MB heap/one worker and analytics disabled for
the existing simulator; stopping it can make newly mounted preview assets blank.

## Apple privacy completion —3:18PM ET

Owner explicitly requested finishing Apple's2.1 privacy details now while keeping
public app release manual. Added and completed Phone Number, Physical Address
and Other Data Types for embedded Stripe onboarding (App Functionality, linked,
no tracking); Crash Data (App Functionality, unlinked, no tracking); Performance
Data and Other Diagnostic Data (App Functionality and Analytics, unlinked,
no tracking). Added Analytics to Coarse Location while retaining functional
collection. Existing13 types and provider disclosures preserved.

Apple immediately published the answers. Full reload confirms19 collected types,
zero Set Up items, published timestamp, linked-data and unlinked diagnostics
preview cards. The optional User Privacy Choices URL stays blank; the submitted
policy URL is https://litterbugs.app/privacy. No legal agreement prompt appeared.
Version2.1.0(28) still Waiting for Review and **Manually release this version**
remains selected (automatic release options0). No binary public release,
resubmission, provider setting, code, build, deployment, push or OTA change.
Apple privacy is no longer pending release work. Remaining: approvals/actual
review feedback and explicit owner authorization for manual public release.

Evidence in `artifacts/mobile-2.1.0/device-evidence`:
`apple-privacy-210-completion.json`, `litterbugs-apple-privacy-210-complete.txt`,
`litterbugs-apple-privacy-210-complete.jpg`,
`litterbugs-apple-privacy-manual-release.txt`.

## Luke TestFlight access and review follow-up —3:08PM ET

At the owner's request, added Luke's existing Account Holder account
(`jameslukeb@yahoo.com`, james barber) to the existing Burrow Bros internal group.
Apple confirmed1 tester added; group now has2 testers. Its Builds page shows
2.1.0(28) with internal status **Testing**. This grants access without changing
his App Store Connect role. His recorded prior installation is2.0.0(18), so
installation/receipt of28 is not claimed. He should open TestFlight using that
Apple account and update Litterbugs to2.1.0(28).

Confirmed the existing Apple submission still **Waiting for Review**; no duplicate
submission. Google quick checks have now completed and its overview explicitly
says **Your changes are now in review**, covering Production25 and Data safety.
Managed publishing remains ON; Apple's manual release remains unchanged. Neither
app was publicly released. Evidence: `litterbugs-luke-testflight-added.jpg`,
`litterbugs-luke-build28-testing.jpg`, `litterbugs-apple28-review-followup.jpg`,
`litterbugs-google25-review-followup.jpg` in the device-evidence folder. No code,
credentials, store roles, backend, deployment or build changes in this follow-up.

## Original frozen candidates (superseded)


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
