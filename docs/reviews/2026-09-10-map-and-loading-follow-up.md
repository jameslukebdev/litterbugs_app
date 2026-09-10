# Map, loading, and device compatibility follow-up

Work continues on `codex/confirmed-iphone-audit-fixes`, after `50be01a`. No store submission or production mobile release is implied by these QA installations.

## Financial test evidence correction

`docs/funded-cleanup-launch.md` records prior successful iPhone sandbox checkout and a controlled live cleanup lifecycle. On August 31, an exact $5 reward transfer completed after the original waiting period, with one transfer, one webhook/audit/notification result, and the contribution marked paid out. The earlier failure and retry were contained and did not duplicate payment. The documentation also records transactional rollback checks for multi-contributor math, refunds, disputes, renewal, aging, and retry behavior.

Those are historical acceptance results, not transactions repeated in this September 10 UX walkthrough. No money was spent and nothing was posted or sent during this follow-up.

## Confirmed causes and changes

- Map label projection previously removed native annotations outside its last calculated viewport. That asynchronous calculation can be stale during the next gesture. Projection now controls label visibility only; it retains every report supplied by discovery, including pending or failed projections. Offscreen points do not suppress visible labels. Label priority and nearly coincident report selection remain deterministic, without introducing numbered clusters.
- The shared photo component restarted its request and unmounted a loaded native image when a later URL hint arrived for the same path. It now retains that image, preserves the same frame through loading/error/success, uses the same 180 ms dissolve as cleanup photos, and enables native memory/disk caching.
- Gallery URL requests start together and retain original path positions, including null slots for individual failures. A slow or failed neighbor does not discard a successful first photo. The gallery reserves all known photo pages from the start.
- Completed report details previously appeared before the cleanup story was ready; inserting the story above them moved the content. The initial completed report body now opens in its final section order after the story resolves. Close remains available. Rank badges reserve their line while loading.
- At maximum accessibility text on the physical iPhone, map previews could extend above the screen, the filter footer wrapped into a tall narrow column, and the email field was partly obscured by the keyboard. Previews now have a bounded scrolling area, large-text filter actions stack across the available width, and the email sheet no longer subtracts 36 points of keyboard clearance. Marker text can shrink slightly within its already scaled bounds instead of truncating the reward.
- Offline Reports already had an error/retry state, but Map silently showed no reports. Map now offers “Reports couldn’t refresh. Tap to try again.” while preserving the map.

## Evidence gathered

Physical device: iPhone 6s, iOS 15.8.2, guest QA app, controlled over USB. Map captures: `/tmp/lb-feature-audit/map-before/` (45 frames), `/tmp/lb-feature-audit/map-retention-after/` (58 frames). These sparse screenshots are functional evidence, not an FPS benchmark or certification that all animation stalls are resolved.

- Repeated pinch in/out and left/right drags completed without crashes. At a very wide zoom all four nearby reports remained reachable through the overlap chooser; selecting the funded report opened the correct $6 preview. City search back to Boone, clearing the boundary, and individual funded-marker selection worked.
- On the first photo-lifecycle build, the physical funded-report gallery displayed and swiped through 1/3, 2/3, and 3/3 without changing the title/reward/footer layout.
- Offline report retry and address-search errors were tested; reconnecting Wi-Fi restored map markers. Wi-Fi was restored to its original network. Maximum text testing used temporary settings; original settings are Larger Accessibility Sizes off and text slider 50%.
- Android API 36 emulator QA build launched. Its initial local map key was rejected by Google. The saved EAS preview key differs from the local development key; the isolated QA staging build uses the preview key. Production key restrictions and repository environment files were not changed.
- Regression suite after the source changes: 379 tests in 83 files passed; mobile source validation checked 148 modules with zero errors. This includes out-of-order image responses, failed photo slots, image retention, initial completed-report ordering, and annotation retention.
- The full rerun also caught a stale source assertion requiring the unbound `Linking.canOpenURL` method. The assertion now protects the receiver-preserving adapter already verified in the earlier Instagram fix.

## Final verification

The final builds passed physical iPhone maximum-text selection, keyboard clearance, bounded preview/chooser scrolling, and offline Map error handling. Android QA verified map tiles, complete marker bounds, normal and enlarged text, repeated launches, styles, dragging, preview galleries and completed-report ordering. Device screenshots are retained under `artifacts/iphone-2026-09-10/follow-up/`.

Compatibility remains bounded by the app's supported OS versions. This follow-up does not certify every phone model, real Android hardware, successful authentication on the physical iPhone, or new financial/provider outcomes.

## Refero guidance and review coordination

Applied `.agents/skills/refero-design/SKILL.md`. Primary lock remains the existing Litterbugs design and September 8–9 decisions: white surfaces, green actions, compact map labels, image-first cards, stable photo frames, and scalable text. Refero's Airbnb map [ef371a8b-cb56-4f4a-a209-fa7b1552a4fb](https://refero.design/screens/ef371a8b-cb56-4f4a-a209-fa7b1552a4fb) supports retaining map context with compact previews; its filters [f30756ae-4022-4a25-97f8-39960a71fcba](https://refero.design/screens/f30756ae-4022-4a25-97f8-39960a71fcba) support scrollable choices and reachable apply/reset actions. Styles reviewed: Shop `99ad9095-ee38-4495-95e1-af4255b27631` for contained photography and Ecosia `c39020e3-5ee4-4c1e-aea5-50599af9bda8` for quiet green utility. Neither palette nor typography replaces Litterbugs' tokens. Motion guidance supports a short 180 ms dissolve without movement or layout shifts.

The existing “Review Luke's latest iOS changes” task performed a read-only review at Grant's request. Its feedback removed a reintroduced logo loading panel, strengthened recovery from late photo URL hints, and informed Android marker host preservation. No changes from that task were overwritten. Completed report loading uses a quiet reserved frame and retains its close action.

### Additional confirmed fixes from device testing

Android custom annotations were clipped through their right edges. Explicit marker bounds alone did not resolve it; preserving the host with `collapsable={false}` did. Normal and enlarged text now show complete pills and status circles. Selected funded markers and horizontal preview pagination were exercised.

At maximum iPhone text, the overlap chooser header and explanatory text consumed the entire sheet. Its heading now flexes beside a reachable close control, the explanation is removed, and the sheet can use 90% of the screen for scrollable report rows. Android retains compact layout at normal text.

The iOS reserved annotation host could receive taps meant for a neighboring visible dot. The native marker patch reports map-local touch positions, and selection checks the actual visible shapes under that position before falling back to annotation proximity. This is bounded to iOS; Android's marker event reports its coordinate rather than a finger position. Regression coverage includes an intercepted tap reaching the intended report.

Android warm relaunch could leave the native splash covering an already-ready map when the React logo disappeared before its load callback. App readiness now independently dismisses the native splash. Repeated force-stop/relaunch checks opened the map; no minimum OS version was raised (iOS 15.1, Android 7/API 24). Android is emulator evidence, not physical Android certification.

Physical maximum-text email input now remains fully visible above the keyboard (`large-email-final.png`). Only the invalid local text “invalid” was entered; no sign-in was submitted.

Final physical tap verification: with maximum accessibility text, touching the funded dot beneath the large $0 label now offered both the unfunded and the correct funded report (`large-touch-final.png`). Choosing the funded report opened the $6 preview; vertical scrolling remained bounded and exposed the rest of its details (`large-correct-funded-preview.png`). The older native-host-only logic had offered unrelated reports at that same location.

Android final build: completed report first exposed the quiet loading frame with close/share actions; after resolution it opened in final order (cleanup result, cleaner/date, after photos, description/metrics, before photos). Scrolling verified both photo sections. Standard/satellite/hybrid map style cycling and left/right drags worked; restored standard map and font scale 1.0. The original physical phone remains the primary UX device.

Offline final phone check: after disabling Wi-Fi (the phone has no SIM), a map drag produced the friendly report-refresh message while retaining map context. Re-enabled Wi-Fi and confirmed reconnection to the original network; returning to the app restored all four markers and removed the error automatically before retry was tapped. Original phone settings were restored: Larger Accessibility Sizes off, slider 50%. Screenshots `offline-map-final.png`, `online-map-final.png`, `restored-text-size.png` record these outcomes.

Physical final completed-report check: the close control remained available during the quiet initial loading state. Resolved content opened with Cleanup Complete, cleaner/rank, date and after-cleanup photography in final order (`iphone-completed-final.png`), matching Android. All final source checks passed: 379 tests across 83 files, 148 mobile modules with zero source errors, and patch reverse-application validation.

The phone also swiped the completed after-photo gallery from 1/2 to 2/2, opened the cleaner's public profile, and displayed its rank plus active report thumbnails. No profile/social mutation was performed. These are targeted final checks of the shared loading changes; the broader feature audit and earlier confirmed fixes remain in the linked September 10 review and ignored device testing report.
