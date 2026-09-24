# Website/mobile experience alignment

## Scope and reference lock

Owner instruction: examine the entire website against the mobile app and bring its UI and UX into alignment, including cards, workflow, map behavior, and login/signup. This is broader than the reporting fixes merged in PR 76. Start from main at be2db5c; preserve Luke’s native app. Work branch: codex/website-mobile-experience-parity.

The native Litterbugs product is the visual and workflow authority. Preserve its Reports/Map/Profile navigation, floating map search and controls, white/soft-gray surfaces, green actions, semantic severity/status colors, compact identity rows, rank artwork, rounded cards, and dedicated activity/payment/settings screens. Reuse existing assets. Desktop adapts the layout and available space, but not the meanings or order of actions. Do not introduce an unrelated visual style.

Reference captures made September 24 in the existing native iPhone 17 Pro QA simulator and the production website using the Codex in-app browser. Physical phone is charging and not yet detected; owner will unlock/trust when powered on. Screenshots are local temporary evidence in /tmp/litterbugs-ui-audit-sep24. Native QA simulator is signed in. Public web captures use the in-app browser; an existing signed-in Chrome Litterbugs tab was subsequently inspected for the account comparison without changing authentication. Other claims requiring equal data states remain pending.

## Initial rendered evidence

1. Website map: working, but header crowds the logo at a narrow width. Menu/list/account structure differs from native navigation. Native map puts city/address search directly over the map and uses semantic colored reward/completion markers.
2. Website list: working, but the search/filter header consumes much of the sheet and the floating Map control overlaps card content. Native uses a dedicated Reports surface with an unobstructed list, reporter/rank identity, favorite button, options menu, and semantic badges.
3. Website report detail: photos and fund/clean actions work as entry points. Mobile includes reporter profile access, directions and completed-cleanup impact presentation; the website ReportDetail has no corresponding components.
4. Website sign-in handoff: tapping Sign in to clean opens generic auth and removes the selected report. Source confirms the handler clears selectedReport; no clean/fund intent is passed to AuthDialog. Native AuthScreen receives pendingAction and adjusts copy and continuation.
5. Native profile: dedicated identity, community rank/progress, My activity, Payments, Settings, and stats. Web account source exposes much existing functionality in one dialog, but does not match this organization.
6. Native activity: Current cleanups, Cleanup history, and My reports tabs with section-specific summaries and empty states. Web uses stacked account sections.
7. Native payments: payout connection, contributions/payment history and cleanup earnings as a separate screen. Web account contributions are labeled/computed for completed cleanups; full history/detail comparison required.
8. Matched account mismatch: native profile displays 3 Reports; signed-in website displays 11 Reports submitted for the same visible Grant Gibson profile/avatar. Native counts paged published non-sample report rows; web uses profiles.reports_created_count, falling back to its limited active list. Align the metric definition and personal report groups, not only styling. Website profile lacks the native rank/progress card and separate activity/payments/settings entry points.
9. Native settings: account/sign-in methods, blocked accounts, help/community, policies, sign-out and deletion groups. Web account settings require restructuring and entry-point parity review.

## Complete surface inventory and verification queue

Status legend: **V** = rendered difference captured; **S** = source comparison identifies work; **Q** = inventory item requiring deeper matched-state verification. None denotes completion of implementation.

| Surface | Native reference | Website counterpart | Required alignment / verification | Evidence |
|---|---|---|---|---|
| App entry / guest browsing | App.js / AuthScreen | app/page / map-experience | Guest entry and pending task continuity; do not force login just to browse | S,Q |
| Main navigation | AppTabs / FloatingBottomTabBar | public-site-header / map-experience | Reports, Map, Profile; active states, preserved scroll, back behavior | V |
| Map search / controls | MapScreen / ReportFilters / LocationSearch | map-experience / place-search | Floating search/filter, controls, report pin affordance, keyboard behavior | V,S |
| Map markers / preview | ReportMapMarkers / MapReportPreview | map-experience markers | Status/reward colors, completed icon, selection, preview before detail | V,S |
| Map camera behavior | MapScreen / reports context | map-experience | Initial region, user location, pan/zoom, selected report and search bounds; prevent unexpected recenter | Q |
| Discovery filtering | ReportFilters / reportFilters | report-browser / report-discovery | Defaults, staged apply/cancel, counts, chips, reset, favorites/hidden and blocked behavior | S,Q |
| Place selection | LocationSearch / placeSearch | place-search | Search results, boundary vs center labeling, clearing, failed/slow search | Q |
| Report list / sorting | ReportsScreen | report-browser | Dedicated list, Closest to me, selected map area, retry and refresh | V,S |
| Report cards | ReportCardDetails / ReportCardMenu | report-browser cards | Photo sizing, severity/status/reward/date, reporter/rank, favorite/menu | V,S |
| Photo viewing | ReportPhotoGallery / RemotePhoto | report-detail / previews | Swipe/buttons, count, zoom/fullscreen, HEIC fallback, loading/missing image | S,Q |
| Report details | ReportDetailsSheet / NavigationRow | report-detail | Header/actions/order, directions, reporter, reward, metadata, status-specific actions | V,S |
| Completed report story | CompletedCleanupImpact | report-detail | Before/after evidence, cleaner identity, amounts/impact and appropriate actions | S,Q |
| Create report | ReportWizardSteps | report-wizard | All five stages, exact labels/cards, selected states, review/edit loops | Q |
| Photo editing / report editing | MapScreen / photo editor | report-wizard / save-report-edit | Add/replace/remove, original fallback, save/cancel, uncertain response | Q |
| Pin placement / relocation | MapScreen | map-experience | Place/change/cancel, draft retention and unavailable location states | Q |
| Report draft recovery | savedReportDraft / submission journal | resumable-report-wizard | Save/resume/discard, account isolation, recovery and visible progress | Q |
| Report renewal / closure | ExpiredReportsScreen | account-dialog | Dedicated attention list, renewal eligibility and confirmation states | S,Q |
| Share flow / public report page | reportSharing / share sheet | report-share-dialog / reports/[id] | Same information, image/link choices, cancellation, return to report | Q |
| Auth provider entry | AuthScreen / AppleSignInButton | auth-dialog | Native provider-first layout and Continue with Email; expose only configured providers | V,S |
| Email login/signup/recovery | AuthScreen / ResetPasswordScreen | auth-dialog / auth/reset-password | Nested email flow, copy, validation, resend, success, loading, support and policies | V,S,Q |
| Auth task return | profile pendingAction / App | public-account-action / map-experience | Preserve cleanup/fund/report destination through sign-in, signup and profile completion | V,S |
| Profile completion/edit | CompleteProfileScreen / EditProfileScreen | account-dialog profile form | Field grouping, avatar editing, validation, save/cancel and keyboard | S,Q |
| Profile overview / points | ProfileScreen / PointsExplanation | account-dialog | Identity, rank asset/progress, points explanation and stats | V,S |
| My activity | ProfileScreen section=activity | account-dialog activity | Three tabs, cards, draft access, current/history/report grouping | V,S |
| Public member profile | PublicProfileScreen | No equivalent route/component in current inventory | Public safe fields, member reports/cleanups, pagination and blocked states | S,Q |
| Block/report member | BlockedAccountsScreen / ReportUserScreen | account-dialog blocked list | Existing unblocking retained; public member block/report entry and confirmation | S,Q |
| Cleanup claim / safety | MapScreen / CleanupWaiverModal | cleanup-action | Once-per-version agreement, per-site confirmation, eligibility and claim errors | Q |
| Cleanup submission / draft | CleanupSubmissionScreen / savedCleanupDraft | cleanup-action submission | Photo/form/review states; native persistent cleanup draft absent from current web component | S,Q |
| Cleanup changes / review | CleanupReviewScreen | cleanup-review-action | Before/after review, changes requested, countdowns and retry states | Q |
| Cleanup feedback / dispute | CleanupFeedbackScreen | cleanup-review-action | Reasons, text, submission confirmation and pending/disputed states | Q |
| Contribution checkout | FundingContributionScreen / FeeExplanationLabel | funding-contribution-action | Amount choices, fee explanation, totals, explicit payment confirmation, cancel/retry | Q |
| Payment return/status | PaymentStatus / payment navigation | payment-return | Pending/success/failure, navigation back and no duplicate payment | Q |
| Payments overview / earnings | ProfileScreen section=payments | account-dialog / payout-setup-action | Dedicated payment hub, payout status and earnings rows | V,S |
| Contributions / payment detail | ContributionHistoryScreen / PaymentDetailScreen | account-dialog completed contributions | Full contribution lifecycle and transaction detail, not only completed cleanups | S,Q |
| Payout onboarding | PayoutSetupScreen | payout-setup-action | US setup only for now; same explanations, pending/failed/return states | Q |
| Settings / sign-in methods | ProfileScreen / SettingsInfoScreen / SignInMethodsScreen | account-dialog settings | Same groups, connected-method visibility, safe help and account actions | V,S |
| Account deletion | ProfileScreen deletion flow | account-dialog | Explanation/confirmation, pending financial holds, error/success and local data cleanup | Q |
| Help / policies / about | SettingsInfoScreen / support links | support/about/terms/privacy/cleanup pages | Shared wording, typography and navigation; retain desktop readability | Q |
| Admin review | Backend-authorized admin flow | admin | Web-specific surface; match brand components without weakening authorization/MFA | Q |
| Loading / empty / failure | SteadyButtonContent / native state views | all web components / app error/loading | Every surface: initial/loading/retry/empty/validation/busy/offline where supported | Q |
| Accessibility / responsive | native accessibility labels / fontScale | all web surfaces | Keyboard/focus, screen reader, touch targets, large text, 320px+ and desktop | Q |

## Acceptance criteria

For each surface: record native reference, website before, implementation decision, website after, matching user/data state, interaction outcome, and remaining platform difference. Capture same report or fixture where possible. A passing build or source similarity is not evidence of rendered parity. Preserve existing functioning flows and server authorization. Keep three-photo limits, no-contribution semantics and the tested GPS publication behavior.

Apple web sign-in needs its separate configured provider; do not expose a decorative nonworking Apple button, change Grant’s developer account, or request the excluded Luke developer access. No account deletion, real payment, legal acceptance, cleanup claim, or public test report is authorized merely to create screenshots. Use isolated fixtures for those states and mark production verification separately. Store submission and international payout activation remain outside this UI work.

Implementation order: shared design tokens/navigation; map/search/markers and report cards; report detail and completed story; account/profile/activity/settings; auth and task return; report/cleanup/payment subflows; public/help/admin surfaces; full responsive/accessibility and regression pass. This order does not reduce scope: every inventory row remains a completion item.

## Current status

Baseline audit and scope inventory only. No website implementation or production deployment has been made in this new alignment branch. Native simulator captures cover map/reports/profile/activity/payments/settings; signed-in web account overview is also captured (11-web-account.png). Native auth and state-dependent transactional flows remain pending. Physical iPhone testing will start after it powers on and is trusted by this Mac.
