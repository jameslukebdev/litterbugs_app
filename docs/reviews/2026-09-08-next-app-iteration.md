# Next mobile iteration: account alignment and location recovery

## Implemented

- Profile Edit action now aligns to the trailing 16-point gutter. The header's right container had overridden horizontal alignment with `justifyContent: center`; it now uses `flex-end` and a 44 × 44 tap target.
- Cleanup statistics no longer reserve a blank second line by default. Equal columns share the number baseline, and a flexible label area centers short and wrapped captions. The larger-text walkthrough caught and corrected a two-line “Awaiting review” misalignment.
- Reports refreshes location on focus, returning from the background, and pull-to-refresh. An explicit action requests permission; simply browsing Reports does not initiate a permission prompt. Denied permission offers Settings, unavailable GPS offers Retry, disabled device services have specific instructions, and cached coordinates are described as last known.
- A failed/restarted lookup clears the previous distance origin. Request ownership prevents delayed permission/GPS callbacks from updating a newer request or an unfocused screen. This logic is separate from the screen and has behavioral tests.
- Reports keeps the map/search area visible separately from its sorting explanation and does not display a zero report count during initial loading.

## Design decisions and sources

Existing Litterbugs is the primary reference: white surfaces, green actions, restrained borders, current navigation. The user's two alignment screenshots specify the local refinements. No new visual theme or marker redesign was introduced.

| Decision | Evidence / role |
| --- | --- |
| Trailing Edit action and centered metric contents | User screenshots and current app gutters; preserve generous touch targets. |
| Permission-specific recovery | [Revolut permission screen](https://refero.design/screens/2b3b084e-e4b3-45a2-a489-1d71167dbcd1): explain the permission and offer Settings. Adapted only for denied access; GPS failure gets Retry. |
| Payment recommendations below | [Wise payment details](https://refero.design/screens/fe8616d6-7195-4cf5-8682-8887652de03a): prominent status/amount and supporting transaction facts. |
| Optional rank explanation | [Google Maps badge progress](https://refero.design/screens/d239ab8b-4967-4e8b-980e-d852d3f15ea4): show concrete actions that contribute to progress. |
| Focus-safe asynchronous work | [React Navigation focus effects](https://reactnavigation.org/docs/use-focus-effect/), [Expo location API](https://docs.expo.dev/versions/v54.0.0/sdk/location/). |

Refero screenshots were visually inspected. Their behaviors inform UI presentation, not claims about Litterbugs' payment or ranking policy.

## Next recommendations, in priority order

All four recommendations below were subsequently implemented; see [account history and recovery verification](2026-09-08-account-history-and-recovery.md). The findings below describe the pre-change audit.

### 1. Make other members' report activity reliable

`apps/mobile/PublicProfileScreen.js:54` derives “Active reports” from the shared geographic map collection and filters only by author. Changing the map area can change the displayed activity, and completed reports can appear under “Active reports.” This is separate from **My reports**, which already has an independent account query.

Load publicly visible reports by member with explicit active/completed states and pagination, preserving server visibility and blocking rules. Add a test that opens the same public profile after changing map area and confirms the same activity and correct status grouping.

Also fix error honesty: line 47 maps a request error to `missing`, while line 126 claims the reporter no longer has a public profile. Use distinct loading, missing, and retryable failure states. This finding is verified in code; an outage was not induced against the live backend.

### 2. Make payment history complete and resilient

`apps/mobile/lib/funding.js:68` fetches only the latest 50 contributions. `ContributionHistoryScreen.js` labels the view “All payments,” has no older-record navigation, and filters completed impact only inside that limited slice. Older records can therefore be inaccessible or excluded from completed impact.

Add stable paginated history with an explicit Load older action and apply the selected history filter across the full query. Keep pending, failed, refunded, received, and paid-out records distinguishable. Verify with local fixtures exceeding 50 records and completed contributions outside the newest page; never create real payments for testing.

`PaymentDetailScreen.js:13` also lacks cleanup/request ownership and retains the previous item when its route ID changes. Guard late results and reset item state for a new payment/account. Extract the shared date/status presentation currently imported from another screen at line 8, consolidating duplicated status labels with `components/PaymentStatus.js`.

The payment race is a code-level risk, not an observed incorrect live transaction. The 50-record limit is directly present in the query.

### 3. Finish account loading and retry states

`ProfileScreen.js:332` initializes funding availability as false, and line 568 immediately renders “Payout setup is currently unavailable” while feature flags may still be loading. Distinguish loading, confirmed disabled, and failed refresh. Guard cleanup/rank/payout requests on blur and account changes, following the existing guarded account-report pattern.

`CleanupSubmissionScreen.js:313` offers only Go back after the cleanup context fails to load. Add a retry that preserves the local evidence draft, with distinct guidance for expired/inaccessible claims versus transient connectivity problems. Test slow requests, retry order, and interrupted draft restoration with isolated data.

### 4. Explain community points without enlarging the overview

The current rank card displays “1 point,” “0%,” and “11 points until Honeybee,” but offers no explanation of how points are earned. Add a small “How points work” action opening a concise sheet with the actual verified rules and the next milestone. Google Maps' badge task breakdown is a useful Refero pattern. Do not invent point awards or imply donations purchase rank.

## Verification and scope

- 294 JavaScript tests passed, including permission states, GPS failures, cached fixes, stale-result rejection, and cancellation.
- Actual iOS regression tests passed for Map/Reports filter synchronization and header/statistic geometry. A further alignment-only run verifies the wrapped-caption refinement.
- CUA walkthrough used the normal `com.gegibson.litterbugs.qa` app on iPhone 17 Pro. No second simulator was opened. Tested no-GPS fallback/retry and larger text; screenshots/results are local test evidence, not production fixtures.
- Native tests temporarily used explicit test coordinates. Their teardown cleared the override; the simulator scenario was also cleared and the simulator restarted afterward. Restored the default text size after verifying the final wrapped-caption layout.
- No production deploy, payment, report publication, cleanup claim, message, or profile save was performed. Real-device GPS, live financial transactions, and the smaller iPhone were not tested in this iteration.

Evidence: `/tmp/lb-next-iteration-native.xcresult`, `/tmp/lb-next-alignment-final.xcresult`, `/tmp/lb-next-iteration-js.log`, `/tmp/lb-cleanup-stats-final-large.png`, and exported screenshots under `/tmp/lb-next-alignment-shots/`.
