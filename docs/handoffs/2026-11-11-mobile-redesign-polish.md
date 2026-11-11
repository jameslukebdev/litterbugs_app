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
- MapScreen split, first pass: `MapScreen.js` went from 2,778 to 2,199 lines by moving code out unchanged into `lib/useReportSharing.js` (share sheet state and the three share actions), `lib/useReportWizardNavigation.js` (report form step state, next/back/jump, swipe, slide animation), `lib/useSelectedReportLoaders.js` (photo, cleanup-attempt and impact loading effects), `lib/uploadReportPhotos.js`, `lib/promptCleanupNavigation.js`, `lib/reportOptions.js` and `lib/mapAlerts.js`. Tests that read MapScreen's source now also read the new files. Map tab renders; the report form and report sheet were NOT exercised on iPhone after the move, so try both before trusting it.
  - Second pass: the report form sheet's layout is `components/ReportWizardModal.jsx` and the floating map controls (report pin, Report Litter / Use this location, cancel, centre-on-me, map style) are `components/MapControls.jsx`. Both take plain props; MapScreen still owns all state. `MapScreen.js` is now 1,926 lines. Map tab and its controls render on iPhone; opening the form was not exercised after the move.
  - Still inside MapScreen (riskiest last): location picking handlers, save/submit report, cancel/discard draft, and the cleanup claim/waiver/release flow (touches money; test on a real claim). These share a lot of state, so the next step is grouping that state (for example one reducer for the report draft) rather than more cut-and-move.
  - No lint config exists. An undefined-name check (`eslint` with only `no-undef`) passes on the whole app; worth adding a real config.
  - Third pass: `lib/mapScreenHooks.js` (report keyboard, photo-preparation notice, feature flags, funding feedback, cleanup notice prompt) and `lib/useCleanupFlow.js` (fund, claim with waiver and payout setup, open submission/review/feedback, release). `MapScreen.js` is now 1,540 lines. On iPhone after these moves: the report form opens and cancels, a report sheet opens with photos and completed-cleanup details, and the share sheet opens. A real claim, release, publish and payment were NOT run.
  - Still inside MapScreen: location picking, save/submit report, cancel/discard draft, photo picking, marker rendering.
- Lint: `npm run lint` in `apps/mobile` (`eslint.config.mjs`, only `no-undef`). It passes; run it after any cut-and-move.
- Website parity (owner asked Nov 11 to keep matching the website, iterating screen by screen):
  - Profile tab now follows `apps/web` account v2: profile and rank are one unboxed page; the Ladybug rank uses `assets/bugs/rank-ladybug.png` (rendered from web `public/brand/ranks/ladybug.svg`; the logo ladybug stays the "needs a cleanup" bug); the rank bar animates with the cocoon on its leading edge; "N points to <next rank>" sits beside the next rank's bug; "How points work" is a purple link and its sheet lists ranks with artwork.
  - My activity follows the website's lists (`components/ActivityRows.jsx`): bold title, date, bug + coloured status; no stat tiles, no Active/Completed/Closed filter, no thumbnails.
  - Settings gained the website's "Cleanup safety" link.
  - Report cards: compared with the live website list at phone width; already matched (state pill, heart, title, cleanup line, types, severity dot, reporter and rank, ••• menu). Left as is. The website's card has a photo carousel; the app shows one photo on purpose (a test pins it).
  - Report sheet: compared with the website's sheet at phone width. Added a favourite heart beside Share and Close, "Get directions" under the photos (opens the existing maps prompt), an unboxed "Reported by" row, and moved the content below the top bar so the title uses the full width. Seen on iPhone for an available report; the completed-cleanup sheet was not rechecked after the spacing change.
  - Report sheet, second round: Hide joined the top bar, "View full photo" opens the uncropped photo full screen, and the "24-hour cleanup claim" note was removed (the website has none). Seen on iPhone.
  - Wizards and flows, compared with the website's local previews at phone width (`/dev-review-preview/report`, `/fund`, `/cleaner`, `/payout`, `/auth`, and `/dev-review-preview` for the reporter's review):
    - Report form: steps 1 to 4 already matched. Review step fixed (Edit level with each heading, cropped photo thumbnails, content-width fund amounts, the "To post, allow location access…" note). Seen on iPhone through step 5; nothing was submitted and the test draft was discarded.
    - Fund: already matched; the long terms paragraph is now the website's one-line refund note. Not seen on iPhone.
    - Claim sheet: the website's three short facts. Not seen on iPhone.
    - Cleanup submission: "Send by" deadline under the heading, the website's helper text, sentence-case labels, "Check before sending", "Send cleanup", "Edit". Not seen on iPhone.
    - Reporter's cleanup review: header "<name> cleaned up this spot" with sent time and auto-approve time, Before/After headings with the ladybug and flower, and "<name>'s note" with its facts. Not seen on iPhone.
    - Payout setup: caterpillar, "Get paid for cleanups", the three numbered steps, the "Secured by Stripe" note. Not seen on iPhone (this account is already set up).
    - Sign-in: new title and subtitle, white Facebook and Google buttons like the website. Not seen on iPhone (would need signing out).
  - Known remaining differences: the website claims in one step with two checkboxes, while the app accepts the agreement and then confirms in a system alert (left alone because it changes the claim logic and cannot be tested without a real claim). The website's photo step shows the reporter's photo beside the after photos, and its review shows Before and After side by side; the app shows them stacked. Payments is not restructured to the website's order. Grant signed in at localhost:3000 in the browser pane on Nov 11, so signed-in website pages can now be viewed there at phone width (`/map?report=<id>` opens a report sheet; `/map?view=reports` shows cards).
- Driving the simulator: a tap only completes when a later tap is sent after a pause. Send the real tap, make any other call (for example the `appearance` query), then send a tap on empty space, then screenshot.
- Claiming is now one step, as on the website (`CleanupWaiverModal.js`, `lib/useCleanupFlow.js`): the sheet has the agreement checkbox (skipped if this version is already accepted) and the site-safety checkbox, and "Claim this cleanup" saves the agreement and claims. The confirmation pop-up is gone; the report sheet reopens showing the claim. NOT run against a real report; test a volunteer claim and a funded claim (payout-setup handoff) before release.
- Embedded Stripe Connect in the app (researched Nov 11, not built):
  - The website embeds onboarding with `@stripe/react-connect-js` and the server's `create-cleaner-onboarding-link` `mode: 'session'` (Account Session). The app still opens Stripe's hosted form in a browser sheet with `mode: 'link'`.
  - Stripe's React Native SDK has the same embedded onboarding component (`ConnectComponentsProvider` / `ConnectAccountOnboarding`, docs: docs.stripe.com/connect/supported-embedded-components/account-onboarding?platform=react-native). The app has `@stripe/stripe-react-native` 0.50.3, which is what Expo SDK 54 pins and does not include it. Versions from about 0.60 add a `react-native-webview` peer dependency (Expo 54 bundles 13.15.0); latest is 0.85.1 and needs React Native 0.75+ (app has 0.81.5). The exact first version with the component was not confirmed.
  - So the app needs a Stripe SDK upgrade past Expo's pinned version plus `react-native-webview`, a native rebuild, and a retest of the fund payment sheet. Waiting on Grant's go-ahead because it touches the payment path.
  - The server already prefills email, US, individual, and the activity description, and the web form skips business type and product description.
- Venmo/PayPal payouts: research only (Nov 11). Grant's rule: do not implement without his approval. Summary given to him in chat: PayPal's Payouts API can pay a PayPal or Venmo account by phone, email or handle (Venmo is US-only), about $0.25 per payout by API, needs a PayPal business account with Payouts enabled and a funded PayPal balance. Open questions before any build: whether moving donor money from Stripe into a PayPal balance creates a money-transmitter problem (Stripe Connect covers this today), who files tax forms, and how refunds and disputes would work. Stripe's own lighter option is Global Payouts (debit card or bank, few recipient details), which carries the same licensing caveat.
- Later on Nov 11, compared with the signed-in website at phone width (`/account/payments`, `/account/settings`, `/members/<id>`):
  - Payments: contributions list first (five rows, then "Show all contributions"), then reporter earnings, then cleanup earnings with payout settings. Seen on iPhone.
  - Settings: the website's two groups and order, no headings, plus "Reset password" (emails a link after a confirmation; not sent during testing). Seen on iPhone.
  - Profile tab icon shows the signed-in member's photo (owner request). Seen on iPhone.
  - Public profile: website header order, the full rank block (`components/RankCard.jsx`, shared with the own Profile) and plain report rows without thumbnails. NOT seen on iPhone.
  - Reports tab: compared, already matches.
  - Financials: owner said to hold off on changing them. Venmo/PayPal and the Stripe SDK upgrade for embedded payout setup are both parked until he says otherwise.
- The simulator also has an older store-style build installed (`com.litterbugs.app`, green design). `litterbugs://` links can open that one instead of the QA build (`com.gegibson.litterbugs.qa`), so don't test with deep links.
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
