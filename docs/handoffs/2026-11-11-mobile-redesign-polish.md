# Handoff: mobile app redesign and polish (Nov 9–11, 2026)

Branch `codex/map-first-navigation`. Nothing pushed, built for stores, or deployed. Do not deploy.

## Done and committed
- `a338b6d` Match the mobile app to the website design: calm map, website bug pins and groups, map key, report cards, report sheet (Fund with the bee, Clean with the butterfly), filters, profile, activity, payments, payouts, settings, report wizard, claim safety step, photo submission and fund screens. All bug art comes from the website SVGs (`apps/mobile/assets/bugs/`). Nunito heading font waits before screens show, which fixed Android falling back to the system font.
- `fdc2473` Polish and 2.1.0 prep:
  - PostHog participation events use the website step names (`lib/analytics.js`).
  - The 3 long-failing payment tests are fixed.
  - Version is 2.1.0.
  - Loading bee (`components/LoadingBee.jsx`) replaces spinners on lists, the report sheet and payment history.
  - Sheets fade their backdrop and slide only the sheet (`components/SlideUp.jsx`).
  - Remaining screen titles use the heading font; the cleanup review and completed-cleanup views are untinted.

- `a63e661` Public profile restyled (plain report count, outlined tabs, ladybug empty state, loading bee).

## Uncommitted (Nov 11 polish, 517 tests pass)
- Checked on iPhone: report rows use the website severity dot (`ProfileReportList.js`); My activity lost its repeated headings and tinted chips (`ProfileScreen.js`); expired reports is untinted with the flower empty state and loading bee.
- Changed but not yet seen on iPhone (simulator taps were unreliable): report user, sign-in methods, blocked accounts, edit profile, the share sheet and the rank-up celebration (now theme colours on a white card).

- Shared components (`apps/mobile/components/ui.jsx`): `PrimaryButton`, `SecondaryButton`, `TextLink`, `ErrorText`, `EmptyState` and `PillTabs`. Use these instead of styling buttons, links, errors, empty states or tabs on a screen.
  - Adopted on: App.js (welcome, profile load error), Profile, public profile, report lists, reports, expired reports, blocked accounts, sign-in methods, report user, edit profile, rank-up, complete profile, reset password, payment activity, payment details, cleanup feedback, the fund screen's status states, and the error states, field errors and Cancel/Edit buttons in cleanup submission and review.
  - Left alone on purpose: the sign-in screen, payout setup, the Continue to payment button, and the icon buttons in cleanup submission/review (tests read their source or they have bespoke busy states). The map is untouched.
  - Seen on iPhone only on My activity. The app loads with no bundler errors; 517 tests pass.
- Loading and failures: content that is loading shows `LoadingBee`; content that failed to load shows `LoadFailure` (in `ui.jsx`: cloud icon, what is missing, one "Try again" link) in its place. Failed actions (save, send, pay, share) and confirmations stay as system alerts, which is the native pattern. Applied to Profile (rank card, earnings, cleanups, reports), public profile, reporter earnings and the completed-cleanup loader in the report sheet. Not seen on iPhone (loads finish too fast locally and taps were unreliable). Still using a spinner on purpose: buttons, photo tiles, location search and the "checking cleanup details" row.
- Colours: 126 hand-typed colours now come from `lib/theme.js`. New tokens: `redBorder`, `yellowBorder`, `green`, `greenBorder`, `greenSoft`, `edge`, `severityLow/Medium/High`, `reportInk/Edge/Soft`. Near-identical shades were merged onto one token each (for example eight browns/ambers became `colors.yellow`), so some map-screen and cleanup-screen shades moved slightly; not compared side by side on iPhone. Kept as literal values on purpose: Google/Facebook/Instagram brand colours, the pin artwork in `components/MapPin.jsx`, and the selection palettes in `lib/litterSelectionColors.js` and `lib/severitySelectionColors.js`.
- `styles/MapScreen.styles.js` went from 2,305 to about 1,340 lines by removing 176 styles nothing referenced.
- Navigation and motion: tabs cross-fade; tapping the current tab scrolls Reports and Profile to the top; the share sheet rises like the other sheets; Android pushes slide from the right and the report-user modal rises from the bottom; the "Reports needing attention" row is now "Expired reports" to match its screen. Tab fade and Reports seen on iPhone; the rest not seen. Android not run.
- `59aa2d8` holds everything above. After it: `PullRefresh` in `ui.jsx` gives every list the same purple pull-to-refresh (and stops the refresh spinner doubling up with the bee on first load); `SlideUp` takes `open` so the points, filter, report and report-wizard sheets sink while their modal fades out (iOS only: Android unmounts the modal content at once). Not seen on iPhone.
- Checked, no change needed: tapping one of your own closed reports opens the report sheet over the map, because the sheet lives on the Map tab.
- Owner preference (Nov 11): leave the app running in the simulator with Metro up while working, and commit as you go. Still no deploys.
- Haptics: `expo-haptics` ~15.0.8 added (`apps/mobile/package.json`, root `package-lock.json`). `lib/haptics.js` wraps it so a build without the native module, or a device without haptics, does nothing. Selection tick on tab changes and `PillTabs`; light tap on `PrimaryButton` and the favourite heart; success buzz when a report is published, a payment is received, a cleanup is submitted and the new rank lands. A fresh simulator build with the module links and runs, and a tab switch (which calls it) does not crash. The simulator cannot play haptics, so this needs a real phone to feel. It is a new native module, so it only works in a build made after this change (the next EAS build picks it up).
- `pod install` here needs `LANG=en_US.UTF-8` (CocoaPods crashes on the folder name otherwise). After it, reapply the EXUpdates fix: in `ios/Pods/Pods.xcodeproj/project.pbxproj` change `bash -l -c \"$PODS_TARGET_SRCROOT/../scripts/create-updates-resources-ios.sh\"` to `bash -l \"$PODS_TARGET_SRCROOT/../scripts/create-updates-resources-ios.sh\"`.
- Simulator note: taps from the simulator tool often only register when the next tap is sent, so screens can be hard to reach.

## Still to do
1. Look at the six screens above on iPhone.
2. Not seen on screen (need a real claim): the claim safety modal and the photo-submit screen.
3. Calm map on Android can't render in local builds. The Google Maps key doesn't allow `com.litterbugs.app.qa` with the debug fingerprint `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`.
4. Release steps (Grant):
   - Add `EXPO_PUBLIC_POSTHOG_KEY` to EAS production.
   - Make the store build.
   - Update the App Store privacy label (needs Luke's account) and the Play Data safety form for session replay and crash reports.
5. At release, add an entry to `docs/agent-handoff.md` (only at deployment, per owner preference).

## Working notes
- Owner direction (Nov 11): the website is the example for the look, but keep the app adapted to mobile app style (grouped rows, sheets, tab bar, thumb-sized targets) instead of porting web layouts.
- Design rules: match the website (`apps/web`). Colour comes from the bugs and text, not tinted chips or panels. Fund is yellow and Clean is lilac. No redundant subtitles. Use `lib/theme.js` colours and `fonts.heading`.
- Test with `cd apps/mobile && npm test` (Vitest). 517 pass.
- Builds:
  - iPhone: the simulator build tool with `apps/mobile/ios/Litterbugs.xcworkspace`, scheme `Litterbugs`. The `ios/` and `android/` folders are local only.
  - Local iPhone fix: `ios/Pods/Pods.xcodeproj/project.pbxproj` has a fix for the space in the folder name (EXUpdates script uses `bash -l "…"`). Running `pod install` again undoes it.
  - Metro runs from `.claude/launch.json` ("app-metro").
  - Android emulator `Litterbugs_API_36`. Install the debug APK as the QA app; `adb reverse tcp:8081 tcp:8081`.
- Disk is tight (about 5 GB free). Check with `df -h` before building.
- Codex also works in this folder. Don't commit its `apps/web` or `docs/agent-handoff.md` changes.
