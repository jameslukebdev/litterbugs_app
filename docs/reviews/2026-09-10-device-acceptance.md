# Physical-device acceptance follow-up — September 10, 2026

This follows the [release follow-up](2026-09-10-release-follow-up.md). Both the Pixel 5/Android 14 and iPhone 6s/iOS 15.8.2 were connected and controllable. The user authorized continued testing, fixes and pushing verified changes to main. No store submission is implied.

## Confirmed corrections

- Android custom map markers previously recaptured every marker bitmap while the global tracking window was open after camera/projection updates. Changed Android markers to explicitly redraw when their artwork, layout or local icon font becomes ready. Unchanged markers no longer continuously recapture during that window. iOS keeps its existing native marker path and stable annotation ordering.
- Android's default location button appeared in the status-bar area, duplicating the app's location control. Its default directions toolbar also appeared underneath app navigation after selecting a marker. Disabled these default overlays; the app's labeled location and report directions actions remain.
- On iOS 15 the authentication screen's back button exposed the internal name “App.” It now exposes “Back”; actual back navigation and Google sign-in cancellation were checked.
- Decorative trash/location icons in report facts and the share-preview privacy icon exposed private-use font characters as separate accessibility text. Hide these decorative elements from accessibility; keep their adjacent readable text and action labels.

The existing Refero reference lock in [map/loading follow-up](2026-09-10-map-and-loading-follow-up.md) remains the visual target: white surfaces, green actions, existing reward/status meaning, stable image frames. These corrections do not introduce a new visual direction.

## Dense Android map evidence

Used a separate, disposable native Map Lab app importing the production marker renderer, label projection and overlap selection functions. Its 1,000 deterministic synthetic reports include 20 at the same coordinate, mixed available/active/completed states and rewards from $0–$8. It imports no application services and blocks application fetches. No synthetic reports were published.

Ran the same two-cycle pinch/drag protocol on the previous renderer and candidate with 1,000 reports loaded and projected. Pixel `gfxinfo` observations:

| Measure | Previous renderer | Candidate |
| --- | ---: | ---: |
| Rendered frames | 567 | 607 |
| Missed-deadline frames | 32 (5.64%) | 15 (2.47%) |
| 95th percentile frame time | 30 ms | 16 ms |
| 99th percentile frame time | 1,750 ms | 700 ms |
| Gesture protocol elapsed time | 42.21 s | 31.76 s |

These are single-device observations, not a statistical benchmark or a promise of smoothness on every phone. The same injected gesture sequence can end at different camera bounds as input timing changes. The final native trees exposed 239 and 288 on-screen report descriptions respectively; the harness still reported all 1,000 projected. Off-screen marker counts are not evidence of disappearing reports. Occasional long frames remain at this density.

The overlap chooser exposed 71 nearby records at the central stack; selecting a different record (`lab-0001`) produced the correct selected green marker, clock icon and $1 reward above its neighbors. At 2× system text size the production reward labels resized and rendered; Android recreated the harness activity at its default 250-report state. The harness's own fixed-size test controls clipped at this size and are not production UI. Restored font size to 1×.

Evidence and reproducible harness/protocol are in ignored `artifacts/release-acceptance-2026-09-10/`, including baseline/candidate XML, PNG and gfxinfo output. The temporary Map Lab package was removed. Its narrowly added QA Maps key restriction was removed and the complete restrictions were verified equal to the original configuration.

## Physical app journeys

Installed Release builds on both phones without deleting either account/session data or the Pixel's older `com.litterbugs.app` copy. The local Pixel QA build uses the existing QA Maps key and matching QA certificate. The earlier locally rebuilt QA artifact had inherited the production-only Maps key from the signed-build staging environment; this test-artifact configuration was corrected. Do not use that older artifact as current QA evidence.

Pixel: live tiles and funded/status markers rendered after pinch/drag; report selection and previews worked. Startup once returned a server Gateway Timeout and showed the friendly retry screen. Try again recovered the signed-in session and live map without signing out.

Pixel funding: the $6 report displayed a $5 contribution, $0.50 fee and $5.50 total. Continue to payment opened the native Stripe payment sheet. Closed it without choosing a method or confirming payment; the form became enabled again and the displayed cleanup reward remained $6. This is a cancellation check, not a new successful transaction. Historical real transaction/transfer/refund evidence remains in `docs/funded-cleanup-launch.md`.

Physical iPhone: current source built and installed successfully on iOS 15.8.2. Live map, funded report, photo paging from 1/3 to 2/3, generated image share preview and native PNG share sheet worked. Canceled the sheet without choosing a destination. Fund action for a guest showed the sign-in gate. Canceled Google's system sign-in prompt and verified all provider buttons recovered; Back returned to discovery. The corrected report-fact icon no longer appeared as a standalone private-use character in the native accessibility tree.

## Accessibility evidence and limits

Enabled TalkBack and VoiceOver on their respective physical phones and verified focus outlines and enabled system state. Android's UI automation server was stopped before the TalkBack attempt. Direct injected swipes/taps still bypassed some screen-reader gesture handling; injected iOS actions likewise operated app controls rather than establishing a reliable VoiceOver traversal. Keyboard shortcut attempts did not establish a reliable TalkBack traversal either.

This does **not** prove a full spoken walkthrough. No trustworthy audio capture was available. Keep complete TalkBack/VoiceOver journey acceptance pending; do not replace it with the passing native-label inspection. Both screen readers were restored off; Android font scaling was restored to 1×.

## Verification and artifacts

Mobile suite: 381 tests across 84 files passed. Source validation checked 149 modules with zero errors; `git diff --check` passed. The marker regression checks assert that camera-only changes do not trigger bitmap recapture, artwork changes do, and queued redraws are canceled on unmount. Physical checks supply the native rendering evidence absent from those tests.

Final local Android QA APK: `artifacts/release-acceptance-2026-09-10/litterbugs-qa-final.apk`, SHA-256 `146778ee3feacf3cea3defaffd92a75b08a8c7c326d6f55c8377c3efafd878a9`. Its arm64-only packaging is for this local Pixel test, not a production device-support change. Physical iPhone Release product: `/tmp/litterbugs-iphone-sept10/Build/Products/Release-iphoneos/Litterbugs.app`, QA identity `com.gegibson.litterbugs.qa`.

Final builds installed successfully on both physical phones. Pixel returned to its live map; the default Google location/toolbar controls were absent after marker selection. On the final iPhone build, the share-preview tree retained its readable privacy sentence and no longer exposed the shield glyph.

## Signed Android build and physical iPhone density follow-up

Built the final source at `ae59d05` as a signed production-identity AAB: `artifacts/release-acceptance-2026-09-10/litterbugs-ae59d05-v11.aab`, SHA-256 `ffcb9f3202287a37f8f36df858da20a386906521c398a7856083ef61f9a328ad`. Package `com.litterbugs.app`, version 1.0.0/code 11 (local review number, not newly reserved in EAS). Contains armeabi-v7a, arm64-v8a, x86 and x86_64. Minimum Android SDK 24, target 36; not debuggable; no RECORD_AUDIO or SYSTEM_ALERT_WINDOW permission. The bundled Firebase configuration selects the production client in `litterbugs-notifications`.

`bundletool validate`, signed APK generation and `apksigner verify` succeeded with the existing upload certificate SHA-256 `2C:0A:31:66:6C:8C:7A:35:04:E9:0D:8E:B8:15:01:67:30:75:40:11:2F:96:90:51:B0:36:AB:13:C1:B0:AA:0E`. `jarsigner` reported “jar verified” with self-signed/no-timestamp and ZIP-stream-order warnings; the resulting APK signature also verified independently. No store upload. Temporary downloaded signing material and password files were removed afterward.

Installed APK splits generated from this exact AAB on the API 36 emulator. Android reported `litterbugs.app: verified`. Both warm and cold unqualified HTTPS report intents opened the production app and rendered the expected title, $6 reward and 1/3 photo counter. Production Google login opened Google's Litterbugs-branded sign-in page; closing the browser returned to the app with its Google button enabled. No account credentials were entered, so this establishes provider launch/cancellation, not a completed non-admin public-account login. Physical Pixel checkout cancellation is documented above; the production emulator remains a guest.

For the iPhone 6s, built the existing synthetic fixture entry directly with device signing. Temporarily installed that test entry under the QA identity after saving the normal signed app; did not modify the simulator-only builder or publish fixture records. The fixture dependency graph excludes application providers and blocks fetch/XHR/WebSocket. All ten status/reward combinations rendered. The crowded scenario retained 80 reports while two zoom steps and a drag increased expanded amount labels from 2 to 4 to 12. Ten coincident reports opened a ten-item chooser; selecting Completed funded rendered its green checkmark/$48 marker at the same center as the prior $6 marker. Screenshots are in the acceptance artifacts directory.

The full native accessibility-tree request stalled WDA on the 80-marker scene. Restarting the automation service restored control; direct coordinate gestures and device screenshots completed the checks without an app restart. This is a testing-tool limitation observed in that scene, not proof that an ordinary user gesture froze the app. No full-tree count or performance benchmark is claimed for the iPhone. The normal signed QA app was reinstalled afterward; this density evidence covers 80 reports, not an unlimited city-scale load.

## Remaining work

- Fresh Google browser sign-in on the production Android identity completed with the existing Grant account; see the follow-up below. Separate Apple/Meta release acceptance remains deferred.
- Full spoken TalkBack/VoiceOver acceptance remains unverified.
- Apple/Meta account setup remains deferred. Android push delivery and report navigation passed in the completion below.

No money spent, social posts/messages sent, reports published, cleanups claimed/approved/disputed, or profile edits saved during this follow-up. Opening and canceling checkout can create an unpaid payment attempt; it does not establish a charge.


## Android notification completion — September 10, 4:04 p.m. EDT

Applied the authorized service-account-key exception only to `litterbugs-notifications`. A temporary, time-limited organization policy administrator grant was removed immediately after saving the project policy. Created the Expo messaging credential and assigned the same credential to both `com.litterbugs.app.qa` and production `com.litterbugs.app` in EAS. No billing was enabled. The local private-key copy was removed after assignment; the active credential remains with Google/Expo for delivery.

Sent one clearly labeled test notification to Grant's registered physical Pixel while the app was in the background. Expo accepted ticket `01a08ceb-1de9-7685-a42c-afdb1ffd37f5`; its delivery receipt returned `status: ok`. Tapping the device's “Litterbugs test” notification opened report `ce154938-f7c9-40d9-99bc-4a5d43710aa0`, showing “Litter at corner of Howard’s Creek Road near C&T”, $6.00 cleanup reward and photo 1/3. This proves delivery and tap navigation on the current physical Android QA build; the production credential is configured but production-device push was not separately exercised.

Evidence: ignored acceptance artifacts `pixel-push-ticket.json`, `pixel-push-receipt.json`, `pixel-push-report.xml` and `pixel-push-report.png`. No push token or private key is included. No application code changed during this completion, so the already-passing regression suite was not repeated. The full spoken accessibility journey and completed public provider login remain the outstanding acceptance items above.


## Production login and local Maps build correction — September 10 afternoon

The initially parked Google request expired before completion. Supabase's callback log explicitly reported `OAuth state has expired` at 20:08:45 UTC and redirected the error to the website. The saved redirect allow list already contained `litterbugs://auth/callback`; no authentication settings were changed. A fresh request reused Google's signed-in account, returned through Android's app chooser to `com.litterbugs.app`, and resumed the intended cleanup funding screen. The $25 contribution/$2.50 fee/$27.50 total appeared; no payment was started. This completes production Android existing-account sign-in/return coverage, not a new-user signup or Apple/Meta check.

The user's flashing loading circle/map observation occurred on the website opened by the expired request. Do not attribute it to the native app without native reproduction. Subsequent native launch inspection identified a separate local artifact defect: the earlier `ae59d05` signed AAB contained the QA Maps key, which is not authorized for the production upload certificate. Earlier report-link checks proved report routing, not successful map-tile authorization. That AAB is superseded and must not be distributed.

Corrected the local native manifest and staging environment to use the existing production Maps key. No key permissions, billing settings, app source, or minimum device support changed. New all-ABI Release artifacts (same code 11, not submitted):

- `artifacts/release-acceptance-2026-09-10/litterbugs-production-maps-corrected-v11.aab`, SHA-256 `2a0bd26b0408753717f0fa793f343f14c6180d01aaf76aa53f2639b21b4941d0`.
- `artifacts/release-acceptance-2026-09-10/litterbugs-production-maps-corrected-v11.apk`, SHA-256 `78939aa45e5d472fc853dbfc91757e7b6cb29ee348077e3f0c974d677499731b`.

Added `scripts/check-android-release-map.py`. For every locally staged release, decode the **finished** APK/AAB manifest, then run the checker with `--manifest`, `--env-file` pointing to the intended EAS environment export, and `--package`. Do not supply the prebuild source manifest. The corrected APK passes; the previous decoded AAB manifest fails, reproducing and catching this mix-up without printing either key. Google service authorization and visible map tiles still require the targeted installed-build check; this guard establishes configuration agreement, not network service health.


Corrected installed-build acceptance: the production APK installed in place with the existing upload certificate (`79e6d25003745740de02ebf98f3a201d5885734c`). Native Google Maps rendered roads, place labels and the $6 report marker. Opening Profile showed Grant Gibson, confirming the existing session survived installation and relaunch. Returned to Map. Both the final APK and AAB decoded manifests pass the new environment guard; `bundletool validate` passed on the corrected AAB. This supersedes the previous artifact's map acceptance. The installed emulator app is the corrected native production build, not the website.

The native launch recording shows the branded logo, with Android's masked native splash changing to the full logo; no flashing loading circle was established. Recording ended before map reveal, so it does not prove a smooth complete launch transition. The subsequent map screenshot establishes tile rendering only. Keep the user's initial website spinner/jump observation distinct from proven native app behavior. Evidence: `production-corrected-map.png`, `production-profile-persisted.xml`, `production-login.xml`, and `production-corrected-launch.mp4` in the ignored acceptance artifacts. No app animation was changed based only on the website observation.


Complete native launch follow-up: a subsequent 45-second recording includes the missing map reveal. At one-second frame sampling, the branded loader remains until approximately 26 seconds, then the map appears at the retained camera with its $6 marker; place labels populate afterward. No loading-circle flash or camera jump was reproduced in this run. This is a slow emulator launch observation, not a cross-device startup benchmark or proof that subsecond flicker is absent. The video is `production-complete-native-launch.mp4`; a sampled contact sheet is `production-complete-native-launch.png`. No new app animation fix is claimed.
