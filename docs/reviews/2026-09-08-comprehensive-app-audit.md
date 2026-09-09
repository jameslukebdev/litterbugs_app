# Litterbugs app audit — September 8, 2026

## Scope and result

The Report Litter fix is complete in commit `9eef8e9`. Reporting now starts with a pin at the current map center, without requiring GPS. Review lets the user change that location while retaining photos and form answers. The optional location finder still handles device permission and GPS availability. See [implementation and validation](2026-09-08-report-pin-workflow.md).

This is the historical recommendation record. See [September 9 implementation and verification](2026-09-09-audit-implementation.md) for subsequent changes. This audit combines the current mobile code, normal iPhone 17 Pro QA build, native workflow tests from the fix, and design research. It is not a certification that every possible defect has been eliminated.

Evidence labels:

- **Observed:** visible in the running simulator.
- **Code finding:** the implementation demonstrates the described behavior; the failure was not necessarily triggered against live data.
- **Risk to verify:** requires a controlled interruption, route change, larger dataset, or additional device test before calling it a reproduced defect.

Keep the existing green/white design, compact map controls, synchronized Map/Reports filters, independent account activity, direct marker previews, selected-marker emphasis, explicit zero-dollar labels, and Photos → Details → Review structure. These are improvements already made, not work to propose again.

## Recommended order

| Order | Recommendation | Evidence | Relative effort |
|---|---|---|---|
| 1 | Make the app usable with larger text | Observed clipping | Medium |
| 2 | Make report submission recoverable after interruption | Code finding; failure risk | Large |
| 3 | Resolve old pending payment attempts clearly | Observed ambiguity; provider status unverified | Medium–large |
| 4 | Isolate payment recovery by account and report | Code finding; route-change risk | Medium |
| 5 | Finish consistent loading/error/retry handling | Code finding | Small–medium |
| 6 | Refresh cleanup reviews and feedback safely | Code finding | Medium |
| 7 | Resume drafts at the appropriate stage | Code finding | Small–medium |
| 8 | Unify photo failure and retry behavior | Code finding | Medium |
| 9 | Clarify personal activity navigation | Observed; usability recommendation | Small |
| 10 | Allow context for every moderation reason | Code finding | Small |
| 11 | Measure and bound map/history performance | Code finding; scale risk | Medium–large |
| 12 | Polish report instructions and navigation | Observed/code; usability recommendation | Small |
| 13 | Reduce state coupling and strengthen native release checks | Code finding | Incremental |

## 1. Make larger text a release requirement

**Observed:** after setting the simulator to `accessibility-extra-extra-extra-large` and reopening the app, the Report Litter label was cut off inside its compact button. The search placeholder was heavily truncated. On Profile, the heading was clipped vertically and the name wrapped mid-word into an unusually tall card. Normal text size was restored after inspection.

Evidence: [map screenshot](assets/2026-09-08-audit/map-largest-text.png), [profile screenshot](assets/2026-09-08-audit/profile-largest-text.png). Relevant code: `apps/mobile/MapScreen.js:2277`, `apps/mobile/styles/MapScreen.styles.js:63`, `apps/mobile/ProfileScreen.js:641`.

**Recommendation:** preserve the compact layout at ordinary sizes, then let controls grow or rearrange at accessibility sizes. Give the report action a full-width row when needed; allow the profile name to use the available width below the avatar. Make header height accommodate its text. Do not solve this by globally disabling text scaling. Check sheet footers, filter chips, account tabs, and payment totals under the same rules.

**Acceptance:** all essential labels and actions remain readable and reachable at normal and largest text, with keyboard open where relevant. Run on the current iPhone and a smaller iPhone. Password reset uses a centered, non-scrolling form (`ResetPasswordScreen.js:49`), so include it specifically; clipping there remains a risk to verify, not an observed result. This follows Apple's [accessibility guidance](https://developer.apple.com/design/human-interface-guidelines/accessibility/) and [larger-text evaluation criteria](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/larger-text-evaluation-criteria).

## 2. Make report submission resumable, not dependent on best-effort rollback

**Code finding:** new-report submission inserts a report, uploads its photos, then updates the photo paths. Upload/finalization failures attempt to delete the report; rollback errors are logged. See `MapScreen.js:911`, `:951`, `:958`, and `:978`.

**Risk:** losing the response after an insert, killing the app during upload, or failing rollback can leave an incomplete record or cause a later retry to create another record. This was not deliberately reproduced against community data, and this audit does not establish whether incomplete records are publicly visible.

**Recommendation:** persist a client submission identifier and progress locally. Reconcile that identifier on retry instead of starting another submission. Keep the report unpublished until required evidence is finalized. Provide clear “Uploading photos,” “Saved on this device,” and “Retry submission” states. Coordinate publication on the server rather than relying only on several client requests succeeding in sequence.

**Acceptance:** interrupt immediately before/after report insert, each photo upload, and finalization; resume to exactly one complete report, retaining the user's photos and answers. Verify the unpublished state cannot appear in public queries.

## 3. Give old payment attempts an understandable resolution

**Observed:** Payment activity displayed two September 2 attempts as “Payment pending” during this September 8 audit. One detail screen said its linked report was no longer available. It correctly said “Attempted total,” not “Total charged,” and provided refresh/help actions. Those safeguards should remain.

The UI alone does **not** establish whether money moved. Current refresh loads the recorded contribution (`PaymentDetailScreen.js:15`, `lib/funding.js:61`); the generic pending explanation is in `lib/contributionPresentation.js:12`.

**Recommendation:** investigate these records against the authoritative payment-provider state, then define a reconciliation path for abandoned, failed, processing, and unresolved attempts. Show a verified terminal status when known. For genuinely unresolved cases, show when status was last checked and a clear next step. Do not automatically describe a payment as failed solely because it is old, or invite another payment while the earlier outcome is uncertain.

**Acceptance:** sandbox examples for abandonment before confirmation, delayed webhook, successful payment with delayed app response, deleted/unavailable report, and eventual refund. Confirm both the contribution amount and fee appear correctly in each state. The already-inspected [Wise payment-detail reference](https://refero.design/screens/fe8616d6-7195-4cf5-8682-8887652de03a) informs the separation of amount, status, and supporting detail; payment truth must come from Litterbugs' provider integration.

## 4. Scope payment recovery to the current account and report

**Code finding:** `FundingContributionScreen.js:81` keeps the attempt and in-flight reconciliation in shared component refs. Its inner async reconciliation updates receipt/attempt state without the cancellation guard used by the outer effect. On a changed user/report, receipt and recovery readiness are not explicitly reset. Report loading also starts without clearing the previous report or restoring loading (`:160`). Payout setup's async status controller deserves the same ownership review (`PayoutSetupScreen.js:34`).

**Risk to verify:** when a screen instance is reused or its owner changes during an outstanding request, an old response can update the current UI. This is not evidence of an observed wrong charge.

**Recommendation:** key the recovery controller to account + report, reset state when that identity changes, and reject stale responses at every state write. Keep the existing payment-attempt identifiers and recovery logic; strengthen their ownership rather than replacing them.

**Acceptance:** delay report A's response, open report B, then complete A; B must not inherit A's amount, receipt, intent, or disabled state. Repeat across sign-out/account change and payout workflow replacement using isolated test sessions.

## 5. Finish the remaining error/empty-state cleanup

**Code finding:** Blocked Accounts alerts on load failure, then can render “No blocked accounts” with no persistent retry (`BlockedAccountsScreen.js:26`). Expired Reports alerts on failure, then can render “Nothing needs a decision” (`ExpiredReportsScreen.js:20`). Its pull-to-refresh handler does not restore loading, so the refresh indicator does not reliably describe a new request.

**Recommendation:** reuse the focused-resource pattern already adopted elsewhere. Separate initial loading, confirmed empty, refresh failure with retained rows, and initial failure with Retry. Scope responses to the current account. Keep error text near the affected content rather than requiring dismissal of an alert to discover the page state.

**Acceptance:** offline first load never claims there are no records; retry succeeds in place; refresh failure retains confirmed content; late responses after account changes do not replace the new account's content. Payment activity already handles several of these cases correctly and can serve as the internal reference.

## 6. Make cleanup review and correction screens refresh safely

**Code finding:** Cleanup Feedback and Cleanup Review cancel late responses, but do not reset context/loading/error when their cleanup identifier changes (`CleanupFeedbackScreen.js:46`, `CleanupReviewScreen.js:172`). Review choices and notes also need a clear lifecycle when moving between cleanup attempts. Feedback's failure screen only offers Go back, even though a transient failure may be recoverable in place.

**Recommendation:** use an owner-scoped resource with Retry, refresh on return to the app, and explicitly handle a cleanup that has already been reviewed or whose correction window has ended. Preserve notes when retrying the same review, but never transfer them to a different cleanup. Present deadline changes before the user spends time updating evidence; keep server validation authoritative.

**Acceptance:** same-screen retry after failure, background/foreground after expiry, a second reviewer completing first, and switching cleanup IDs with a request in flight. These transitions require fixtures; no live cleanup decision was submitted during the audit.

## 7. Improve draft recovery beyond retaining the fields

**Code finding:** the app saves the wizard step (`MapScreen.js:234`) but Resume passes only the coordinate and form, then resets the wizard (`:677`, `:703`). Missing saved photo files are silently filtered out (`lib/savedReportDraft.js:46`).

**Recommendation:** resume the last valid stage. If a required photo is missing, explain that the photo needs to be added again and return to Photos. Add a small “Continue draft” entry with saved time in My activity, making recovery discoverable without pressing Report Litter first.

**Acceptance:** resume Photos, Details, and Review with the same valid data; deleting a local photo produces a specific explanation; account A never sees account B's draft. Existing native tests already prove basic field/photo retention and saving for later—this is the next refinement.

## 8. Use one reliable report-photo component

**Code finding:** `ReportList.js:55` retains the previous URL while a new photo path loads. Its error handler refreshes a URL once, but a second image failure returns without an explicit failed state. The forced-refresh callback lacks the cancellation guard used by the initial fetch.

**Recommendation:** share a photo component that distinguishes loading, absent photo, and failed photo; clears stale content when the source changes; ignores old responses; and offers an appropriate retry. Keep a quiet neutral placeholder while loading and avoid treating a network failure as missing evidence.

**Acceptance:** expired signed URL, offline image load, repeat failure after refresh, and source replacement while loading. Test map preview, list thumbnail, details, and cleanup evidence rather than fixing only one surface.

## 9. Make personal activity categories easier to understand

**Observed:** My activity's top tabs are Current, History, and Reports. The first two describe time, while the third describes a kind of activity. Reports then introduces another Active/Completed/Closed selector. The screens work, but the hierarchy requires users to infer which activity “Current” means.

**Recommendation:** consider “Cleanups | My reports” as the first choice, followed by appropriate status filters. Alternatively, retain the current structure and explicitly label “Current cleanups” and “Cleanup history.” Keep the independent account data. Add a useful empty-state action such as Browse reports for no active cleanups, and Continue draft when one exists.

**Acceptance:** a first-time user can find their submitted report and their claimed cleanup without trying multiple tabs. Do not remove direct access to expired-report decisions. This is a navigation recommendation, not a newly discovered data bug.

## 10. Let users explain any moderation report

**Code finding:** the details field appears only for Other (`ReportUserScreen.js:89`), so categories such as harassment or a safety concern cannot include contextual explanation.

**Recommendation:** offer optional “What happened?” text for every reason; require it for Other. Keep the target account/report visible and explain that this is sent for moderation. Preserve a typed explanation if the user changes the reason. Add unsaved-change protection when there is meaningful text.

**Acceptance:** each reason can include context, validation preserves the text, Back does not silently discard a substantial report, and double-tapping cannot create duplicate submissions. No moderation report was sent during this audit.

## 11. Measure map and history behavior with realistic volume

**Code finding:** geographic queries retrieve successive 500-row pages and set the collection after all pages finish (`lib/reports.js:94`). Each map-label projection requests a native point for every marker (`lib/useMapLabels.js:12`). Contributions and public-profile history render loaded entries in ScrollViews (`ContributionHistoryScreen.js:22`, `PublicProfileScreen.js:120`). Map requests already reject stale results; retain that protection.

**Risk to verify:** wide map views or long histories can become expensive as usage grows. Current small live data does not demonstrate a performance failure.

**Recommendation:** benchmark 1,000, 5,000, and 10,000 fixture reports before choosing an optimization. Introduce an explicit geographic fetch/render budget with honest displayed counts or progressive loading, cancel obsolete work where supported, and avoid projecting unnecessary candidates. Virtualize growing history lists. Preserve the user's preferred dots/selective labels and selection behavior; do not silently omit reports while implying all are shown.

**Acceptance:** record time to first results, interaction responsiveness, memory, and list/map count consistency under rapid pan/zoom and pagination. React Native explains the tradeoffs in [FlatList optimization](https://reactnative.dev/docs/optimizing-flatlist-configuration).

## 12. Polish report instructions and step actions

The new location behavior and three-stage structure should stay. Smaller improvements remain:

- Use neutral required-photo guidance initially; reserve warning emphasis for an attempted invalid action. The current helper is rendered before any attempt (`ReportWizardSteps.jsx:153`).
- Add breathing room between photo guidance and the optional title.
- Consider explicit “Next: Details” / “Next: Review” labels instead of arrow-only visual navigation (`MapScreen.js:2570`). Retain accessible button names and progress indication.
- Keep the exact map target and Change location action introduced by the fix; clarify that the pin identifies the litter, not the user's current position.

The [Uber Eats location-confirmation screen](https://refero.design/screens/bab12cb3-802d-45e8-a571-ea03b396393e) supports clear target instructions and explicit confirmation. The inspected [Pool reporting flow](https://refero.design/flows/11982) supports keeping related evidence and report fields together. These references inform interaction details, while Litterbugs remains the visual authority.

**Acceptance:** a new user can place the pin, identify what is required, advance, revise location, and resume without explanation. Validate keyboard and larger-text behavior with the revised labels.

## 13. Continue architectural separation and make native checks dependable

**Code finding:** MapScreen is now approximately 2,628 lines with 50 state declarations, substantially smaller than the earlier 6,200-line version. Wizard, details, and marker responsibilities have already been extracted, but MapScreen still coordinates many setters and async lifecycle transitions. Some native tests depend on a signed-in account, available QA reports, or no existing draft, and skip otherwise (`native-tests/LitterbugsUIRegression.swift`).

**Recommendation:** next extract a report-draft/submission controller and model browse, pin placement, form editing, and submission as explicit states. Use typed or documented component contracts to reduce large setter lists. Keep shared status/amount presentation. React's [state-structure guidance](https://react.dev/learn/choosing-the-state-structure) supports avoiding contradictory and duplicated state.

For verification, separate deterministic local fixture tests from non-mutating real-account smoke checks. A skipped required regression should not count as release coverage. Stabilize software-keyboard setup and reset simulator preferences. Add denied permission/no GPS, large text, small phone, interrupted submissions, stale request ownership, and repeated selection/zoom to the gate. Include a bundle/render smoke check to catch undefined component props that source-text assertions miss.

**Acceptance:** mandatory fixture tests run without skips on a clean simulator and fail on an actual clipped control or wrong selected report. Keep fixtures isolated from the normal user app experience.

## Coverage and limits

| Area | Evidence used | Further validation required |
|---|---|---|
| Map, filters, markers, Reports | Current code; normal map walkthrough; prior marker work | Dense data, small phone, VoiceOver |
| Report pin and three-stage wizard | Native tests + computer-use walkthrough | Interrupted publication against isolated backend |
| Draft recovery and location edits | Passing native tests; code | Every resume stage and missing files |
| Profile and personal activity | Normal-size walkthrough + largest-text screenshots; code | Longer names, long history, smaller screen |
| Edit/complete profile, auth, password reset | Code and existing native coverage | Auth-provider/recovery flows without touching the real account |
| Contributions and payment details | Read-only existing-record walkthrough; code | Provider reconciliation and sandbox financial scenarios |
| Payout setup and earnings | Code, normal Payments overview | Isolated onboarding and payout lifecycle |
| Cleanup submission/review/feedback | Code | Controlled claims, correction expiry, reviewer races |
| Blocking, moderation, expired decisions | Code | Offline transitions and isolated mutations |
| Public profile and account settings | Code; earlier iteration context | Large datasets and account-deletion recovery |

The fix passed 305 JavaScript tests plus the targeted native report-entry, review-edit, and draft-recovery tests documented separately. This audit did not rerun the entire app's native suite or establish a new all-features pass. No live report publication, payment, cleanup claim/review, moderation submission, account change/deletion, or notification was triggered. Payment-provider truth, production RLS/security, external legal pages, real-device GPS, Android, and the public website are outside this mobile audit's verified scope.

At the time of this audit only documentation and screenshots were added. Subsequent implementation is recorded in the linked September 9 report.
