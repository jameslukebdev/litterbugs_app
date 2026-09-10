# Final app audit for user testing — September 10, 2026

> Completion update: confirmed fixes are merged and pushed to `main`. The [physical Pixel audit](2026-09-10-physical-android-audit.md) covers signed-in journeys, gestures and sharing; the [device acceptance record](2026-09-10-device-acceptance.md) adds final installs on both phones, dense-marker checks, signed Android report links, and successful Android notification delivery/tap navigation. These records supersede the historical installation, branch and notification gaps below. Controlled user testing can begin. Full spoken accessibility, completed public production login, and deferred Apple/Meta configuration remain release acceptance work.

## Outcome and scope

This pass closes the remaining ordinary UX walkthrough gaps with five additional recovery fixes. It builds on the full physical iPhone audit, the map/loading follow-up, and the documented August financial and authentication acceptance runs. The build is a candidate for controlled user testing, not a claim of exhaustive bug freedom or store-release certification.

No money was spent, social content posted, messages sent, real cleanups approved/disputed, or real accounts changed. Synthetic workflows ran in a separately identified simulator app with fake service modules. Current production iPhone checks used the guest QA app and preserved its data.

## Five fixes

1. **Account report loses work after Back → Keep editing.** Reproduced in a native stack: the alert appeared after the native screen had already left; choosing Keep editing returned to the menu and left navigation out of sync. Replaced the unsupported `beforeRemove` prevention with `usePreventRemove`. Retest kept the exact entered text on the report; Discard returned normally. Reason-only drafts are also protected, and submission blocks navigation. This follows React Navigation's [native-stack guidance](https://reactnavigation.org/docs/navigation-events/#beforeremove) and [usePreventRemove](https://reactnavigation.org/docs/use-prevent-remove/).
2. **Cleanup review asks users to refresh but has no retry button.** Reproduced by loading evidence, leaving temporarily, failing the next refresh, and returning. Added Try again; retained photos remain visible during retry. Offline retry and restoration were exercised.
3. **Cleaner feedback hides refresh failures.** The old feedback remained visible without indicating that its status could not be checked. Added the friendly error and Try again, retaining the feedback. Update submission is unavailable until the current status has loaded successfully. Deadline/status errors now also surface instead of silently repeating refresh.
4. **Denied cleanup photo access has no Settings shortcut.** Native photo permission denial produced only an OK alert. Added Not now and Open Settings, with friendly fallback if the handoff fails. Verified denial, the new alert, Settings handoff, and subsequent granted access to the native picker.
5. **Password recovery has no exit after a failed reset.** Source inspection confirmed the screen replaces app navigation and only offers Save. Added Not now, clearing recovery mode without updating the password or showing the success message. Native synthetic failed reset displayed its existing friendly error; Not now returned successfully.

## Coverage ledger

| Area | Evidence and result | Limits |
| --- | --- | --- |
| Discovery: map, search, styles, filters, sorting, favorites, overlap selection | Physical iPhone September 10 main audit and follow-up; Android API 36 map/marker/text/galleries; final updated iPhone opened map, Reports and correct detail | No quantified FPS benchmark or every manufacturer/GPU combination |
| Reports and photos | Physical active/funded/unfunded/completed details, galleries, directions handoff, public profiles; creation wizard validation, edit/review and draft recovery in earlier signed-in simulator walkthrough | No new live report published today |
| Cleanup submission | Current native production component: description saved/exited/restored; photo denial and Settings; native library picker selected a local checkerboard; preview displayed selected photo/description and Edit details. Synthetic existing-submission recovery reached the submitted confirmation | The synthetic service already supplies a submission record, so this does **not** certify a new upload or backend transition |
| Volunteer/paid cleanup review | Current native production component: before/after evidence, $6 reward presentation, paid waiting/ready states; approval confirmation and simulated failure recovery; dispute text Keep editing, Save and leave, reopen with exact text retained | No real payout, approval or dispute sent |
| Cleaner feedback | Current native retained-context failure, retry, reconnection; note retained and stale update action disabled | Real deadline transitions remain backed by service/regression coverage |
| Expired reports | Current native populated $6 report, renewal error recovery, close/refund confirmation canceled | No real renewal or refund |
| Funding, payment history, payout setup | Earlier September 10 signed-in audit covered amount limits, checkout cancellation, waiver/preflight, pending-to-not-completed history. August financial records cover successful checkout, live $5 lifecycle and transfer, rollback checks for refunds/disputes/renewal/idempotence | No new transaction today; current bank/provider behavior not freshly certified |
| Authentication and profile | Earlier guest validation and provider cancellation; signed-in stats/rank/activity/edit-discard/settings. Current synthetic reset failure/exit and moderation draft recovery; final physical guest profile renders all help/support/legal actions | Historical email/Google/Facebook successes credited; fresh provider-owned account/consent paths not all rerun |
| Sharing and support | Earlier physical Facebook and Instagram handoffs/composers canceled. Final updated iPhone rendered share preview/options and canceled cleanly. Help/support/legal previously verified | No social publication; store-identity link and provider approvals are separate gates |
| Notifications | Destination mapping and state transitions reviewed in `cleanupNotifications.js`, covered by the passing regression suite | Real APNs/FCM delivery, notification-tap launch under final store signing, and multi-account delivery need release-device acceptance |
| Accessibility/offline/lifecycle | Physical maximum text, email keyboard clearance, map offline/reconnect and repeated gestures in follow-up; Android enlarged text/warm launches. Current native interruption/draft/retry work above | Full VoiceOver/TalkBack journeys and physical Android coverage remain acceptance items |

## Builds and verification

- iPhone 6s / iOS 15.8.2: full Release build succeeded and installed in place as `com.gegibson.litterbugs.qa`. Post-install map, Reports, detail, sharing preview/cancel and guest Profile smoke checks passed. Returned to Map. No minimum OS or device-specific production restriction added.
- Android QA arm64 Release: build succeeded with the same six changed production files. This final incremental build was not installed/rerun; the preceding map/loading build had passed the Android API 36 walkthrough.
- iPhone 17 Pro / iOS 26.5 simulator: separately identified `com.gegibson.litterbugs.journeys`, production screen components with local service substitutes; no credentials. Native-stack navigation, AsyncStorage and image picker are real. This is screen/interaction evidence, not backend acceptance.
- `npm run test --workspace @litterbugs/mobile`: **379 passed, 83 files**.
- `npm run mobile:check-source`: **148 modules, zero errors**.
- `git diff --check`: passed.

Screenshots and local fixture overlays are preserved in ignored `artifacts/iphone-2026-09-10/final-audit/`. `isolated-journeys/` contains the exact fixture entry/state, stub modules and simulator-only builder. They are not part of production entry points. The final entry invokes the network guard; fake Supabase/session/report modules prevent real service operations in every baseline and final walkthrough. An early baseline entry imported the guard without invoking it; this was corrected before final runs. No real Supabase client was present in either configuration.

## Design and prior evidence

Followed the existing Refero lock in [map/loading follow-up](2026-09-10-map-and-loading-follow-up.md#refero-guidance-and-review-coordination): existing white/green Litterbugs screens, secondary outline recovery buttons, readable error copy, no new branded interstitial or visual redesign. Prior feedback from “Review Luke's latest iOS changes” remains incorporated in the base branch.

Related records: [confirmed iPhone fixes](2026-09-10-confirmed-iphone-fixes.md), [merge verification](2026-09-10-merge-verification.md), [financial acceptance](../funded-cleanup-launch.md), [authentication acceptance](../auth-test-checklist.md), and ignored `artifacts/iphone-2026-09-10/testing-report.md`.

## Remaining release acceptance

Controlled user testing can begin with the QA build. Before broad store release, complete real physical Android testing, screen-reader journeys, signed store-build notification delivery/deep-link/provider-return checks, and the existing Apple App ID transfer/entitlement and Meta approval tasks. Apple sign-in was explicitly deferred pending the App ID transfer; it was not added or declared a new regression here. Use the existing financial evidence and approved test environment for subsequent payment regression, rather than silently charging a card.

These are explicit coverage limits, not a promise that every edge case on every phone has been eliminated. The fixes remain on `codex/confirmed-iphone-audit-fixes`; this audit does not merge them to main or publish a store build.
