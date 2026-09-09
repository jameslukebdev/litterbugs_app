# Litterbugs: workflow, code, and interface audit

September 9, 2026. Recommendations only. Baseline: `eff18cf` on `codex/refero-mobile-improvements`.

This pass includes the user's September 9 screenshots and feedback about location settings, activity totals, payment wording, inactive status badges, and jumping Profile/Payments layouts. It follows the earlier implementation; it does not treat already-delivered improvements as missing.

## Immediate answers

- **Remove the persistent Open settings action from the Reports header.** Location is optional for browsing a map area. Offer permission recovery when someone chooses a location-dependent action, such as Closest to me or the location finder.
- **The activity numbers have a real definition/data mismatch.** The matching Grant Gibson account shows seven lifetime submissions, but its six retained reports are sample data and are excluded from My reports. No retained, published, non-sample reports and no cleanup attempts exist for that account. The cleanup zeros are correct; the seven-submission footer is misleading beside the empty personal report list.
- **Check status is currently a label, not a button.** Use a state description in the badge, a separate working action, and share the verification result between details and history.
- **The loading complaints involve behavior as well as wording.** Refreshes should retain useful content and its dimensions. Replacing “Stripe” with “payment” will not fix layout jumps or repeated blank screens.
- **A new workflow blocker was reproduced:** report → Fund → Back → View report can remain on Loading report indefinitely. Fix this before further visual polish.

## Evidence and boundaries

Inspected the normal QA application on iPhone 17 Pro, iOS 26.5, using computer use. Walked Reports, filters, personal activity tabs, payment history/details, a report's contribution review, and cleanup entry through the acknowledgment screen. No contribution, waiver acceptance, cleanup claim, cleanup decision, report publication, moderation report, or account change was submitted. Supabase verification was read-only against linked Litterbugs project `mvaygkflcjswtwchflrk`.

The audit combines **observed behavior**, **code-demonstrable findings**, and **explicit test gaps**. It is not certification that every transaction and role combination works. Signed-out authentication, successful payment/refund/payout, cleaner/reporter collaboration, interrupted uploads, real GPS, VoiceOver, and Android still need their stated end-to-end checks.

Earlier native and JavaScript results remain useful historical evidence, documented in [the implementation report](2026-09-09-audit-implementation.md). They were not rerun or relabeled as fresh results here. In particular, passing navigation tests do not establish that a charge, payout, or cleanup approval succeeds.

## Verified account statistics

The database contains several profiles with the same display name. These results concern the one matching the screenshot's **Grant Gibson / seven submissions** combination, not every similarly named account.

| Measure | Read-only result | Interpretation |
|---|---:|---|
| Profile lifetime submission counter | 7 | Incrementing counter, not the current personal list count |
| Retained published non-sample reports | 0 | Matches My reports: Active 0, Completed 0, Closed 0 |
| Retained sample reports | 6 | Two active, four closed by the activity grouping rules; intentionally excluded from normal report lists |
| Cleanup attempts assigned to this account, all states | 0 | Completed 0, Awaiting review 0, Active 0 are correct |
| Ranking ledger | One report-created event, 1 point | Matches Ladybug / 1 point |
| Rank progress | 0% within Ladybug; 11 points until Honeybee | Correct under the current rank thresholds, not “zero lifetime contribution” |

The one ranking event refers to a retained report that is **currently marked sample**. The ledger matches the displayed point, but test-data treatment is inconsistent across the counter, ranking ledger, and visible reports. Do not silently erase legitimate historical points or infer the original classification from today's sample flag.

The deployed report-counter function checks publication but not `is_sample`. Its column documentation describes a lifetime counter seeded from retained reports and incremented on insert; the publication migration also increments on first publication. There is no reconciliation of seven historical increments from the six retained rows alone. A deleted report or historical adjustment is possible, but this audit does not establish which.

Recommended contract: current My reports counts derive from the same owner-scoped, published, non-sample records as their lists. If a lifetime count is retained, label it explicitly and back it with auditable qualifying events, including a deliberate deletion/sample policy. Use a separate test account/data policy. Display a placeholder or unavailable state when counts are unknown, never a fabricated zero. Show `Active (n)`, `Completed (n)`, and `Closed (n)` on My reports, with an optional All view. Label the other measures as cleanups **you performed**.

Sources: [accountReports.js](../../apps/mobile/lib/accountReports.js), [ProfileScreen.js](../../apps/mobile/ProfileScreen.js), [cleanup.js](../../apps/mobile/lib/cleanup.js), [cleanupProfile.js](../../apps/mobile/lib/cleanupProfile.js), [ranking.js](../../apps/mobile/lib/ranking.js), and the live aggregate/counter-definition queries. My reports' three empty tabs were also checked in the simulator.

## Prioritized findings and acceptance criteria

### 1. P1 — Reopening a report after contribution review can never finish loading

**Observed:** Reports → the $6 report → Fund → Back → View report. The loading overlay persisted across repeated observations for more than a minute. Closing it and opening the report afresh recovered the screen. [Captured evidence](assets/2026-09-09-follow-up/report-reopen-stuck.png).

**Cause:** `openReportDetails` resets photo URLs and sets `photosLoading` true each time. Entering Fund closes details without clearing `selectedReport`. Reopening the same ID/photo paths does not retrigger the photo effect, whose dependencies are unchanged. The all-screen loading overlay then hides the usable report. Equivalent state-reset risks exist for cleanup/impact resources when the same report is reopened.

**Recommend:** reuse valid report resources or start an explicit resource refresh on reopening; pair every loading flag with an actual request and settled/error path. Render available report text/actions while the photo region loads. Keep Close in the safe area: the current loading overlay puts it at `top: 18`, visibly against the status bar; the lower part of its touch area was needed to dismiss it.

**Acceptance:** Fund → cancel/back → reopen the same report repeatedly, including funded, in-progress and completed records. Photos settle or show Retry; no indefinite overlay. Close works with all supported insets and text sizes.

Sources: [MapScreen.js](../../apps/mobile/MapScreen.js), `openFundingContribution`, `openReportDetails`, photo/cleanup/impact effects; [ReportDetailsSheet.jsx](../../apps/mobile/components/ReportDetailsSheet.jsx); [MapScreen.styles.js](../../apps/mobile/styles/MapScreen.styles.js).

### 2. P1 — Reconcile activity definitions, sample data, and unknown counts

The verified account mismatch above is not explained solely by “reporting and cleaning are different.” The footer uses a lifetime counter that includes history absent from the visible personal list. Ranking uses a third definition. Additionally, `cleanupSummary = cleanups.data ?? emptyCleanupSummary()` lets statistic tiles/footer display zero before a first successful response or after an initial failure, even when the list itself has a loading/error state. Cleanup attempts are fetched in one unpaginated request, so list-derived lifetime counts also need protection against the API's row cap as an account accumulates history.

**Recommend:** the explicit statistics contract above, a reviewed historical reconciliation, and consistent loading/error handling for the tiles and footer. Keep current cleanups, completed cleanups, reports submitted, and ranking points distinct and understandable.

**Acceptance:** sample, unpublished, deleted, expired, cancelled, completed and active reports; each cleanup state; loading/failure; account switch. Every visible number can be reconciled to the corresponding list or a clearly labeled lifetime definition. No production counter changes based only on this QA account's mismatch.

### 3. P1 — Preserve personal history when discovery excludes a report

**Code finding:** My reports includes cancelled rows in Closed. Opening one navigates through Map, whose `getReportById` requires `cancelled_at IS NULL`. That row cannot open through the normal fallback. Separately, `loadCurrentUserCleanupSummary` discards attempts whose report is not returned by its report query, so unavailable/hidden reports can remove cleanup history and earnings entries.

**Recommend:** separate discovery eligibility from authorized personal-history retrieval. Retain a history row with its known outcome and an “Original report unavailable” fallback. Closed owner reports should open a read-only detail/history view when permissions permit, with the reason and next action. Do not broaden public visibility or bypass access rules.

**Acceptance:** open cancelled and expired owner reports; view a completed cleanup whose report is unavailable; verify counts/history/earnings remain consistent. Test both permitted and unauthorized access.

Sources: [accountReports.js](../../apps/mobile/lib/accountReports.js), [reports.js](../../apps/mobile/lib/reports.js), [ProfileScreen.js](../../apps/mobile/ProfileScreen.js), [cleanup.js](../../apps/mobile/lib/cleanup.js).

### 4. P1 — Keep payment verification consistent across screens

**Observed:** an existing September 2 payment resolved to Not completed with a checked time in details; history still displayed Check status on return. The list displays a $25 contribution amount, $2.50 fee and $27.50 attempted total. These are not evidence of a completed charge.

**Cause:** `loadMyContribution` attaches `providerState` and `checkedAt` only to its returned detail object. `loadMyContributions` does not receive that snapshot. Age then turns a pending row back into `needs_check`.

**Recommend:** account/payment-scoped shared verification snapshots with explicit freshness and invalidation, while retaining the server ledger as payment authority. Use a descriptive badge and a separate action. Give confirmed-incomplete, processing, unknown, received and refunded payments distinct wording and recovery. For a missing report, show payment help directly rather than instructing someone to return to an unavailable report.

**Acceptance:** details and history agree after verification, foregrounding, navigation and cold restart as appropriate to freshness. Unknown never becomes failed/charged solely from age; an unfinished payment cannot look like a successful contribution. Status controls expose correct button/text accessibility roles.

Sources: [funding.js](../../apps/mobile/lib/funding.js), [contributionPresentation.js](../../apps/mobile/lib/contributionPresentation.js), [PaymentDetailScreen.js](../../apps/mobile/PaymentDetailScreen.js), [ContributionHistoryScreen.js](../../apps/mobile/ContributionHistoryScreen.js).

### 5. P1 — Apply discovery filters before the result budget

**Code finding, large-data case:** discovery loads at most 1,000 rows ordered by ID, then applies status, funding, severity and keyword filters locally. A matching report beyond the first 1,000 can disappear from a filtered search; an empty result can be misleading despite the existing truncation notice. Newest/distance ordering only sorts the retained subset.

**Recommend:** retain the performance budget, but apply meaningful filters before limiting; use an appropriate server query/RPC for compound filters, matching counts and ordering. If only a partial result is available, describe that accurately and avoid a definitive “No reports” claim.

**Acceptance:** a dataset with more than 1,000 records and matches beyond the first ID page, sparse funded/completed subsets, changing bounds and keyword search. Map and Reports must use the same result contract.

Source: [reports.js](../../apps/mobile/lib/reports.js), `refreshReports` and client filtering; [mapWorkBudget.js](../../apps/mobile/lib/mapWorkBudget.js). Not reproduced with thousands of live records.

### 6. P2 — Keep Profile, Payments, and detail layouts stable during refresh

**User-observed and code-supported:** Profile jumps on entry; Payments inserts Checking Stripe connection and removes that row when the account is unconnected. Profile's native RefreshControl treats any resource loading as a user pull-to-refresh. Rank's first-load layout has different geometry from its content; other conditional sections arrive independently. My reports, cleanup review and feedback also substitute loading content during refresh despite retained data.

**Recommend:** distinguish first load, background refresh and user-requested refresh. Keep previously loaded content in place and preserve scroll position. Match first-load placeholders to the final layout, including dynamic text. Use a stable payout status/action area; a quiet Updating indicator is sufficient when useful content is already present. Refresh only resources the current page needs. Do not mask delayed business outcomes with a decorative animation or invented success.

**Acceptance:** repeated tab visits and Back, foreground return, slow response and failure with cached content. Record transitions on small and large iPhones; controls remain in place and focused fields keep the keyboard/focus. Check no false zeros or new-account data flashes.

Sources: [ProfileScreen.js](../../apps/mobile/ProfileScreen.js), [useFocusedResource.js](../../apps/mobile/lib/useFocusedResource.js), [asyncResource.js](../../apps/mobile/lib/asyncResource.js), [payoutConnectionPresentation.js](../../apps/mobile/lib/payoutConnectionPresentation.js), cleanup review/feedback screens.

### 7. P2 — Remove the location nag and make sorting deliberate

**Observed:** Reports nearby → 2 reports → Map area → Newest first/location off → Open settings takes substantial space before search. These reports can belong to a searched/remembered area far from the user's actual location. Location loading temporarily drops the sorting origin, so refresh can change ordering from distance to newest and back.

**Recommend:** title the page Reports. Put search and filters first, then a compact area/count and explicit sorting choice. Default to a stable choice such as Newest. Request location only after Closest to me or a location action, and offer Settings only if denied. Preserve map-centered Report litter. Use “reports in this area” instead of “nearby/around you” when that is what the data represents.

**Acceptance:** denied, undetermined, permitted, unavailable and cached location; browse another city; refresh without rows unexpectedly moving. No permission prompt just to view Reports or begin pin placement.

Sources: [ReportsScreen.js](../../apps/mobile/ReportsScreen.js), [reportsLocation.js](../../apps/mobile/lib/reportsLocation.js), [useReportsLocation.js](../../apps/mobile/lib/useReportsLocation.js). Refero Fresha/SeatGeek and Apple permission guidance below support contextual location requests.

### 8. P2 — Make filter Apply, Close, and recovery unambiguous

**Observed/code:** the sheet has Reset and Show reports but no visible Close. Choices and keyword edits immediately change shared filters; Show only dismisses. The focused keyword field sits at the bottom. There is no keyboard avoidance in this modal. Software-keyboard overlap was not established in this pass because the simulator did not display its software keyboard.

**Recommend:** draft filter changes inside the sheet, show a preview count, commit with Show reports, and allow explicit Close/Cancel. Reset affects the pending selection. Preserve compact removable chips and one filter button. Make keyboard/footer behavior explicit and offer a useful filter-removal action for no matches.

**Acceptance:** close without applying, apply, reset, remove chip, keyboard typing and dismissal, large text, partial-result counts, and Map/Reports synchronization. Refero Airbnb's full flow shows an explicit close/apply model and recovery from restrictive filters.

Source: [ReportFilters.js](../../apps/mobile/components/ReportFilters.js).

### 9. P2 — Show the same lifecycle and funding meaning everywhere

**Code finding:** Reports rows show completion or severity, but omit visible in-progress/awaiting-review/change-request states. Zero funding has no visible explanation in the row. Positive funds continue to use Cleaner reward regardless of whether work is available or already complete. The contribution screen says Cleaner currently receives before a cleanup has been approved.

**Recommend:** one shared presentation model for available, claimed, submitted, changes requested and completed. Pair a concise status with funding text: “No funds yet,” “Cleanup reward $6,” or the verified completed reward outcome. Do not equate an empty fund with a permanent volunteer-only commitment unless that distinction exists in product data. Preserve tiny clock/check marker icons and selective labels; the preview/details explain what compact markers cannot.

**Acceptance:** funded and unfunded reports in every lifecycle state, selected/unselected and dense map views, matching list/detail states. No completed report advertises an available reward; no empty fund requires guessing a leaf's meaning.

Sources: [ReportList.js](../../apps/mobile/ReportList.js), [cleanupEligibility.js](../../apps/mobile/lib/cleanupEligibility.js), [FundingContributionScreen.js](../../apps/mobile/FundingContributionScreen.js).

### 10. P2 — Improve contribution and report-creation handoffs

**Observed:** Fund opens a clear contribution review with an itemized $25 + $2.50 = $27.50 total and a reachable secure-payment button. Back returns to a map preview, requiring View report to recover the prior detail context. **Code:** report publication with a starting contribution leads into eligibility/payment loading labeled Finishing your report although publication already succeeded. Some copy promises automatic payment-screen opening after approval.

**Recommend:** preserve the originating report/detail context on Back and cancellation. State “Report posted” separately from optional “Add funds.” Explain when no charge has happened. Keep the chosen amount and fees visible, but require a deliberate Continue action when a delayed funding review becomes ready. Simplify the policy summary while keeping contribution, fee, total, funding lock and refund terms accessible. Use one contribution term and one cleanup-reward term consistently.

**Acceptance:** report without funding; report with delayed/declined/approved funding eligibility; cancel payment; return later; payment outcome arrives after navigation; no surprise payment sheet or duplicate publication/charge. Preserve the existing stable submission/payment IDs and recovery protections.

Sources: [ReportWizardSteps.jsx](../../apps/mobile/components/ReportWizardSteps.jsx), [MapScreen.js](../../apps/mobile/MapScreen.js), [FundingContributionScreen.js](../../apps/mobile/FundingContributionScreen.js).

### 11. P2 — Make cleanup entry and completion read as one journey

**Observed:** Help clean this up opens a long safety acknowledgment. **Code:** acknowledgment → claim confirmation → payout setup when required → return to claiming introduces multiple transitions. The initial claim confirmation explains 24 hours; success is an alert with a deadline. Subsequent status explanations are distributed across details, activity, submission, feedback and review.

**Recommend:** before the acknowledgment, show the selected place, reward/no funds, 24-hour commitment, required after photos, and whether payout setup is needed. Make setup a clear preparatory step; reserve only after the actual claim succeeds. Keep the existing consent and safety terms intact and accessible. After claiming, present one stable summary with deadline, Directions, Submit cleanup photos, and a secondary Cancel cleanup action explaining release. After submission, show who is reviewing and the actual deadline/next action. Avoid calling an unapproved submission “complete.”

**Acceptance:** funded/unfunded and self-cleanup, setup cancellation/return, two cleaners claiming simultaneously, expiry, release, photo correction, resubmission, reporter approval, automatic approval, dispute and payout delay. Current screens were reviewed through acknowledgment only; these role-dependent outcomes need sandbox accounts.

Sources: [MapScreen.js](../../apps/mobile/MapScreen.js), [CleanupWaiverModal.js](../../apps/mobile/CleanupWaiverModal.js), [payoutWorkflowGate.js](../../apps/mobile/lib/payoutWorkflowGate.js), cleanup submission/review/feedback and payout screens.

### 12. P2 — Finish draft and review-text recovery

**Code finding:** cleanup draft loading silently drops missing local photos; unlike report drafts, it does not return an explicit missing-photo explanation. Cleanup drafts save on each edit, including file checks, which can churn the Saving/Saved line. Review change reasons and notes are component state with no exit guard or durable draft. Returning from another app refreshes review/feedback through an all-screen loader.

**Recommend:** explain missing cleanup photos while preserving all remaining answers. Debounce routine draft saves and flush on explicit exit/background/submission; show save failure prominently without a flashing per-keystroke status. Protect unsent review/dispute text from accidental Back. Keep evidence visible during refresh and make stale submission/deadline changes clear before accepting a decision.

**Acceptance:** write, attach, leave, kill/relaunch, missing local file, failed storage write, old review replaced by newer submission, correction deadline crossed during editing. Earlier idempotent submission work remains in place.

Sources: [savedCleanupDraft.js](../../apps/mobile/lib/savedCleanupDraft.js), [CleanupSubmissionScreen.js](../../apps/mobile/CleanupSubmissionScreen.js), [CleanupReviewScreen.js](../../apps/mobile/CleanupReviewScreen.js).

### 13. P2 — Replace internal vocabulary and raw errors throughout the app

Use outcome + next action. One loading message per operation; references belong under help. Provider naming is useful when explaining a handoff or who handles payment/bank information, not as recurring diagnostic chrome. Preserve required disclosures and consent, rather than globally deleting every occurrence of Stripe.

| Current copy | Recommended direction |
|---|---|
| Checking Stripe connection… | Updating… in an existing payout-status area; no separate banner for routine refresh |
| Stripe connected | Ready to receive cleanup rewards |
| Stripe status unavailable | Couldn't update payout details. Try again. |
| Loading payment… / Checking the latest recorded status. / Checking status… | Show known summary with one Updating… indication; first visit can say Loading payment details… |
| Check status (inactive badge) | Confirmation needed (descriptive badge), with a working View details action |
| This older attempt needs a status check. Open payment details before trying another payment. | We haven't confirmed this payment yet. View details before paying again. |
| Attempted total | Payment amount, paired prominently with the actual unconfirmed/incomplete state; never Total paid without confirmation |
| Verified with Stripe [date] | Last checked [date], secondary information after an actual check |
| Reference: [UUID] | Copy payment reference inside Get payment help |
| Cleaner currently receives | Current cleanup reward |
| Sign in with a permanent account | Sign in to join this cleanup |
| Preserved as a completed community impact record | Cleanup approved. Thank you for helping. |
| Resubmitting creates a new revision | Your earlier photos and feedback will stay in the cleanup history. |
| Your report ... will enter the moderation queue | Your report is private. Our team will review it. |
| Expired report decisions | Reports needing attention, with a count; show expiration/renewal context inside |

These are proposed messages, not blanket string substitutions. For example, “not completed” must not promise that a bank has no temporary authorization. A genuinely processing payment needs different guidance from an unknown one.

Some save, funding, payout and expiry handlers still display `error.message` directly. Add a shared mapping from known failure conditions to plain-language, actionable text; retain technical details in diagnostics. Review accessibility labels, success alerts, empty states, backend-supplied user summaries and notification text as well as visible headings.

Sources: [payoutConnectionPresentation.js](../../apps/mobile/lib/payoutConnectionPresentation.js), [contributionPresentation.js](../../apps/mobile/lib/contributionPresentation.js), [PaymentDetailScreen.js](../../apps/mobile/PaymentDetailScreen.js), [PayoutSetupScreen.js](../../apps/mobile/PayoutSetupScreen.js), [ReportUserScreen.js](../../apps/mobile/ReportUserScreen.js), cleanup and report screens.

### 14. P2 — Add full transactional journey tests, not just navigation smoke tests

The prior native suite covers map behavior, profile controls, draft/review navigation and payment-history navigation. It does not execute payment success/failure/refund, claim-to-approval, or publication after interrupted upload. This pass found a defect in a simple round trip not covered by those checks.

**Recommend:** isolated test accounts and provider sandbox transactions with explicit checkpoints after each step, at least one reporter and a different cleaner. Preserve local fixture-only apps and never mix their statistics with normal QA accounts. Include cancellation, backgrounding, offline/retry, delayed completion and account switching. Check business outcomes in addition to visible messages.

**Acceptance:** one report/charge/claim/submission per logical action; correct matching counts/amounts; stable return context; reachable recovery; no native-test skips counted as passes. Run the key journeys on a smaller iPhone with the software keyboard and larger text, and inspect VoiceOver focus after dialogs and error messages.

Source: [LitterbugsUIRegression.swift](../../apps/mobile/native-tests/LitterbugsUIRegression.swift), [LitterbugsFixtureRegression.swift](../../apps/mobile/native-tests/LitterbugsFixtureRegression.swift), and the prior implementation's explicit verification boundaries.

## Journey coverage and remaining checks

| Journey | This pass / current evidence | Required completion check |
|---|---|---|
| Welcome → explore as guest | Code reviewed; welcome offers map and sign-in paths | Cold start, offline start, guest-to-account return without losing intended action |
| Sign up, verify, sign in, reset password | Code reviewed; friendly validation/recovery already exists | Dedicated email/OAuth test accounts; expired links, cancel, already-registered, password reset return |
| Search area → filters → map/list → report | Normal UI walked; explicit filter-close gap; bounded-query issue identified | Large dataset, manual search failure, keyboard, selected state and no-match recovery |
| Find current location | Current denied state and implementation reviewed | Real-device permitted/denied/approximate/stale/unavailable GPS; no false physical location claims |
| Report litter → pin → Photos → Details → Review | Current code + prior native three-stage/GPS-free/draft evidence reviewed | Publish with a lost upload/publication response; one report only; restored photos/answers; optional funding separated |
| Edit/withdraw report | Code reviewed; locking/confirmation already exists | Eligible owner, concurrent funding/claim, stale report, back/discard, closed history result |
| Fund report → review total → pay → receipt | Normal UI to contribution review; no payment initiated | Test-mode success, cancel, decline, authentication challenge, processing, lost response and reopen |
| Payment history → details → help | Normal UI walked; stale status and wording defects reproduced | All received/processing/refunded/incomplete states, correct shared snapshot and accessible help |
| Set up payouts → return to cleanup | Code reviewed; recurring status/jump exposed in user's screenshot and UI | Test-mode onboarding cancellation, pending verification, return, eligible/ineligible, account switch |
| Claim cleanup → directions → active work | UI through acknowledgment; remaining code reviewed | Two-account claim race, consent/setup/claim order, deadline, external maps return, release |
| Submit cleanup photos and description | Code/draft/retry path reviewed | Real native camera/library, upload loss, duplicate tap, missing file, restart, correction request |
| Reporter review → approve/request changes/dispute | Code reviewed | Correct before/after evidence, two-account outcome, stale submission/deadline, preserved note, approval/reward semantics |
| Completed cleanup → history/earnings/share | Code and prior native completed-report evidence | Retained history if report inaccessible, delayed payout, receipt linkage, native share cancel/return |
| My activity / rank / statistics | UI tabs + live aggregate and ledger queries | Reconciled counter policy, sample/deletion treatment, nonzero cleanup accounts, failure/unknown states |
| Profile edit, Save/Back, settings | Code + prior native edit/header/keyboard evidence; user jump screenshot | Avatar permission/upload failure, stale save, smooth reentry, larger text throughout |
| Public profile, block/unblock, report account | Code reviewed; no moderation action sent | Own/other/blocked users, preserve report text, back/cancel, retry and inaccessible-source behavior |
| Expired report → renew/close | Empty page seen earlier this pass; code reviewed | Real eligible sandbox records, deadline crossing, locked funds/refund outcome and list synchronization |
| Sign out/delete account and external policy/help links | Code reviewed; no account mutation | Dedicated disposable account, pending-work explanation, cleanup of local account-scoped state, working return/deep links |

No new functional defect is asserted in rows marked code-reviewed only unless it is described in the findings. Their untested outcomes remain test requirements, not claims of failure or success.

## Refero and primary-source grounding

Research used the installed Refero skill: Airbnb's style as a reference for restrained marketplace chrome, concrete iOS screens, and full multi-step flows. Litterbugs' compact green-and-white design remains the authority; no rebrand is proposed.

- [Fresha address entry](https://refero.design/screens/c50feb6f-4179-4fd7-adca-4398add6bc5f): visually inspected; manual address entry and optional Use my location sit together. Adapt the contextual permission choice.
- [SeatGeek location search](https://refero.design/screens/7112df0b-3580-4617-b0a4-a0b70940dafb): manual city search remains available alongside location permission. Its full screen description was reviewed.
- [Airbnb map filtering flow](https://refero.design/flows/6389): reviewed all step summaries and relevant screen detail; selected card, explicit filters, close/apply actions and no-result recovery. Adapt workflow clarity, not its ranking or proprietary map algorithm.
- [Pool location issue reporting flow](https://refero.design/flows/11982): reviewed complete flow and visually inspected confirmation; grouped evidence/details, selected photo thumbnails and a short acknowledgment. Preserve Litterbugs' stricter photo/location requirements and three stages.
- [SSENSE checkout flow](https://refero.design/flows/7108): reviewed complete step logic and a checkout image; preserve order context and totals while correcting payment information. It is an analogy for recoverable contributions, not a recommendation to copy its page length or loading screen.
- [Apple privacy guidance](https://developer.apple.com/design/human-interface-guidelines/privacy/): permission requests should have a clear contextual purpose.
- [React Native testing overview](https://reactnative.dev/docs/testing-overview): native end-to-end coverage is needed beyond JavaScript component checks; consistent with the previous audit and its stated test limits.

Refero supplies examples, not proof that a pattern will perform better for Litterbugs. The proposed behavior should be checked against the acceptance cases above.

## Implementation order

1. Fix the report-reopen blocker and safe-area escape; preserve return context.
2. Reconcile statistics and personal-history retrieval without guessing historical events.
3. Unify payment status, simplify status/action wording, and remove redundant loading chrome.
4. Stabilize shared refresh behavior, Profile/Payments geometry and review/draft continuity.
5. Refine Reports header, contextual location sorting, filter semantics and lifecycle labels; correct filtering before the query budget.
6. Complete dedicated transactional journey tests and smaller-device/keyboard/accessibility verification before calling the workflows finished.

The audit produced this document and a screenshot only. Application code and backend data were not changed.
