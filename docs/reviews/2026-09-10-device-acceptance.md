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

## Remaining work

- Build and validate a newly signed production Android bundle from the final source, retaining all supported ABIs; recheck production report links/provider returns. The older signed bundle predates these changes.
- Full spoken TalkBack/VoiceOver acceptance remains unverified; dense physical iOS behavior is not established by this Android harness.
- Real Android push delivery and tap navigation remain blocked by Google organization policy and missing administrator permission, as detailed in the release follow-up. Registration alone is not delivery. Apple/Meta account setup remains deferred.

No money spent, social posts/messages sent, reports published, cleanups claimed/approved/disputed, or profile edits saved during this follow-up. Opening and canceling checkout can create an unpaid payment attempt; it does not establish a charge.
