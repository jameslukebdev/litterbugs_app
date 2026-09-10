# Physical Android UX audit — September 10, 2026

> Subsequent work: the fix branch was fast-forwarded into `main` and pushed. See the [release follow-up](2026-09-10-release-follow-up.md) for signed builds, notification registration and the additional Profile loading correction. Branch/merge status at the end of this original audit is historical.

## Device and installation

Pixel 5, Android 14, USB-authorized physical control using ADB and UI Automator, including two-finger gestures. The old `com.litterbugs.app` (1.0.0, version code 10, September 3 update) was preserved with its data. It opens an Expo development-server launcher rather than a standalone bundled app. Installed the current standalone arm64 Release as **Litterbugs QA**, `com.litterbugs.app.qa`, alongside it. No minimum OS requirement changed (Android minimum SDK 24).

Signed in successfully with the user's confirmed existing BurrowBase Google account. Both installations handle the custom app scheme; Android offered an app chooser on the OAuth return. Selected QA without changing the default handler. Subsequent reinstalls and cold launches preserved the QA session.

## Confirmed fixes

1. **Android map reports exposed only “Map Marker.”** The React Native Maps manager stored the accessibility label on its wrapper, but did not pass it to Google's native marker. Added `MarkerOptions.contentDescription` through the existing dependency patch. Android report markers recreate only when their spoken title, funding or status changes; zoom, pan, selection and label allocation retain their identity. Existing iOS map fixes are preserved. Physical retest exposes the correct title, amount and available/active/completed status on all four reports. See Google's [MarkerOptions reference](https://developers.google.com/android/reference/com/google/android/gms/maps/model/MarkerOptions).
2. **Loaded report photos retained “Loading report photo.”** Reproduced with a visibly rendered second gallery image and a stale progress label in the native accessibility tree. Distinct loading and loaded native hosts clear that old label while preserving the image lifecycle. Matched physical retest renders photo 2 of 3 and exposes its report description, with no loading announcement left over.
3. **Navigation labels clipped after changing Android text size while running.** The fixed line height and native scaling produced clipped inactive tab labels until restart. Navigation text now applies its existing maximum 1.2× scaling explicitly with adequate line height; ordinary screen content continues to follow system text size. Physical retest at 2.0× system text, including live 2.0→1.0→2.0 changes, keeps all three labels legible.

The visual direction remains the existing Refero white/green Litterbugs design lock documented in the [map/loading follow-up](2026-09-10-map-and-loading-follow-up.md). No new user-facing technical copy or branding added.

## Hands-on coverage

| Journey | Result and limits |
| --- | --- |
| Installation and session | Separate standalone QA install/update, guest exploration, Google cancellation and successful existing-account return, signed-in profile, restart persistence. Old app remains installed. |
| Map and discovery | Location permission and centering; Boone search/boundary and clearing; filters and matching funded result; standard/satellite/hybrid/terrain styles; repeated two-finger zoom and drag; reports remain rendered and selectable. Four live reports provide overlap/label-allocation coverage, not a dense-city performance benchmark. |
| Photos and details | Funded report photo carousel, matched before/after accessibility check, own report detail and list photo, title/reward layout, public reporter information. No real report edited. |
| Sharing | Opened the installed Instagram Stories composer with the generated report card, then discarded it. Android general share sheet contains image and reward text; canceled without choosing a recipient or posting. |
| Report creation | Selected only a synthetic checkerboard from Android's native picker. Required litter type and severity gates work. Reached review, saved for later, resumed with photo/location/type/severity intact, then discarded. Removed the synthetic phone photo. No report submitted or personal image uploaded. |
| Funding | Zero and $1,001 amounts disable checkout; $5 yields $0.50 fee and $5.50 total. Stripe payment choices open (Google Pay, Link, card, Cash App, bank); canceled without selecting or confirming a payment method. A canceled checkout can leave a payment-attempt/history record, but no funds were charged. |
| Payment history and payouts | Existing contributions display amounts and fees; checking a pending contribution updates it to Not completed. Completed-impact empty state and payout eligibility/setup screen render. No payout onboarding or transfer started. |
| Profile/activity | Existing account stats/rank, active/closed reports, current/history cleanup empty states. Local bio edit → Keep editing → Discard retains then discards text correctly. No profile update saved. Help/support pages and the blocked-accounts empty state also passed. |
| Accessibility and larger text | Native map/photo labels checked; enlarged report list, profile and detail inspected at system font scale 2.0. Full spoken TalkBack and iOS VoiceOver journeys remain separate acceptance items. |
| Offline/lifecycle | Temporarily disabled Wi-Fi/data: retained reports and friendly list/photo recovery actions appear. Restored both connections and original font scale. Cold launch retains account. |

No money spent, social posts/messages sent, new report published, cleanup claimed/approved/disputed, or profile edit saved. Existing [financial acceptance](../funded-cleanup-launch.md) remains the evidence for the previously authorized successful checkout, live $5 cleanup/transfer and controlled refund/dispute/renewal checks; these were not repeated with real money today.

## Verification and remaining work

- Mobile regression suite: **380 tests passed, 83 files**.
- Source validation: **148 modules, zero errors**, including the navigation adjustment.
- Android standalone Release built and installed; final navigation retest passed. Native dependency patch reverse-application check and `git diff --check` passed. No QA package entry in the retained Android crash buffer.
- The shared JavaScript component adjustments have not received a new physical iPhone install during this Android pass; the earlier iPhone release audit remains linked below.

Before broad store release: merge the reviewed fix branch into main and build the final signed candidates; verify real APNs/FCM delivery and notification-tap launches, production links/provider returns, full screen-reader journeys, Apple App ID transfer/Apple sign-in and remaining Meta public approval tasks. Store privacy/data-safety declarations must match the final build. These are release acceptance items, not a claim that this one Pixel represents every Android phone.

This supplements the [full app audit](2026-09-10-final-app-audit.md), [iPhone findings](2026-09-10-confirmed-iphone-fixes.md), [merge verification](2026-09-10-merge-verification.md), and [authentication acceptance](../auth-test-checklist.md). Fixes remain on `codex/confirmed-iphone-audit-fixes`; no store publication or main merge performed here.
