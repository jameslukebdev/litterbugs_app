# Follow-up implementation: report, activity, payment, and agreement workflows

September 9, 2026. Approved scope: [follow-up audit](2026-09-09-follow-up-app-audit.md), plus removing the previous company display name and replacing visible document version codes with friendly dates. Baseline `eff18cf`.

## Reference lock and decisions

Retain Litterbugs’ compact green-and-white design. The approved audit is the reference lock: [Airbnb filter flow](https://refero.design/flows/6389) for draft/apply/cancel and selected-report context; [Fresha location entry](https://refero.design/screens/c50feb6f-4179-4fd7-adca-4398add6bc5f) for optional location; [Pool reporting](https://refero.design/flows/11982) for grouped evidence and clear acknowledgment; [SSENSE checkout](https://refero.design/flows/7108) for retained payment context. Refero illustrates the interaction direction; implementation tests establish Litterbugs behavior.

- Keep search available without GPS. Newest is the default; requesting closest sorting is deliberate.
- Keep loaded content during refresh; display unknown statistics as unknown.
- Keep compact markers. Explain funding and lifecycle in the selected card, list, and details.
- Keep legal consent explicit. Show a short preparation summary before the existing agreement, and a readable publication date instead of internal identifiers.
- Retain the authoritative server ledger. Recent provider checks supplement pending payment records; cached checks expire after five minutes and never override terminal ledger states.

## Delivered changes

| Audit item | Implementation |
|---|---|
| 1. Report reopening | An explicit reopening revision refreshes photos, active cleanup, and completed impact resources. Returning from contribution review reopens the same report. Existing report content remains usable while photos load; Close respects the safe area. |
| 2. Activity definitions | Personal footer and report-tab counts use the owner-scoped, published, non-sample list. Cleanup totals paginate all qualifying attempts. Loading/failure cannot manufacture zeros. Public profile counts follow the visible public activity contract. Historical counters and ranking events were not rewritten based on an incomplete reconciliation. |
| 3. Personal history | Authorized ID lookup can retrieve closed reports; discovery still excludes them. Missing original reports no longer discard known cleanup outcomes or earnings. Closed/expired reports cannot offer new funding. |
| 4. Payment consistency | Account/payment-scoped persisted verification snapshots are shared by details and history, expire after five minutes, and yield to terminal server states. The known payment renders before a slower verification finishes. Missing reports retain payment help. |
| 5. Discovery budget | Status, funding, and severity are pushed into the database request. Keyword, exact geography, and blocked-user checks apply before the accepted-result budget. Stable newest-first pagination continues until enough matching results or exhaustion. Rendering remains limited to 1,000 matching reports, with an explicit partial-result notice. |
| 6. Stable refresh | Account-scoped resource caches retain Profile, rank, cleanup, and payout content on return. Native refresh controls reflect actual pull gestures. The rank placeholder matches the final layout. Review evidence and feedback remain visible while refreshing. |
| 7. Reports/location | Search and filters come first; title is Reports. Default Newest and explicit Closest choices replace automatic location sorting. Settings recovery appears only after a denied location-dependent request. A refresh retains its last ordering origin until a fresh result or confirmed loss of access. |
| 8. Filters | Local draft choices, explicit Close, draft Reset, and an Apply action. The preview count uses the same discovery query without changing the map’s active filters. Requests are debounced and cancelled when obsolete. Keyboard avoidance preserves the footer. |
| 9. Shared language | Map previews, report rows, and details share lifecycle/funding presentation. Empty funds say No funds yet. Completed reports do not advertise an available reward. |
| 10. Contribution handoffs | Back retains the originating detail context. Published reports say Report posted. Delayed eligibility explains that the person chooses when to continue; no automatic payment sheet is introduced. Existing payment/publication idempotency remains intact. |
| 11. Cleanup preparation | The agreement begins with the selected report, reward, 24-hour commitment, required after photos, and payout preparation. It explicitly says that reading has not reserved the cleanup. Existing consent, claim confirmation, deadlines, directions, submission, and release behavior remain in force. |
| 12. Draft/review recovery | Cleanup drafts report missing photos, retain answers/submission identity, debounce routine saves, and flush on background or leaving. Unsent review/dispute text is stored per account/cleanup/submission, with Save and leave protection. Refresh does not replace available evidence with a full-screen loader. |
| 13. Plain language | Confirmation needed is a state badge; View payment details is the action. Removed older-attempt, attempted-total, recurring provider-diagnostic, visible UUID, permanent-account, and community-impact-record wording from the affected paths. Known errors map to actionable messages. |
| 14. Verification | Added native filter-cancel, Fund/Back/reopen, and friendly-waiver cases; added behavioral coverage for payment snapshots, sparse discovery beyond 1,000 source rows, paginated cleanup history, missing evidence, lifecycle text, and stable location refresh. Full transactional sandbox validation remains pending the separate environment described below. |

## Agreement and public-policy publication

Migration `20260909123056_publish_litterbugs_cleanup_acknowledgment.sql` was dry-run checked, then applied to the linked Litterbugs project `mvaygkflcjswtwchflrk`. The active document is `cleanup-acknowledgment-2026-09-09`, retaining the existing safety-guideline identifier internally. The migration retires the previous active document and clones its content with only the requested company-name substitutions. It does not update acceptance records, claims, payment rows, or historical document bodies.

The mobile dialog uses “Cleanup safety and agreement” and the document’s readable publication date. The acknowledgment still records the exact internal identifiers. Current mobile/web runtime source and the active database document were scanned for both spellings of the retired display name. Old migration/history records remain as an audit trail, not current UI copy.

The linked live website required its own correction. A separate checkout of the actual production deployment’s commit `657e6d71dcf38ea4d936ac49579650c992c433c3` was used to avoid publishing unrelated unreleased website work. Only six policy/agreement presentation files changed. The production-environment candidate was built with domain assignment deferred, its four policy pages verified through authenticated deployment access, then promoted:

- Project: `litterbugs-web` / `prj_hDcnkGzuGnASZk4wLngecDxYxh2K`.
- Deployment: `dpl_8JVzJJwjAunGPDzHszbjLcJL8S1W` / `https://litterbugs-ihxbg1a7p-grant-9890s-projects.vercel.app`.
- Live `/terms`, `/privacy`, `/cleanup-policy`, `/cleanup-safety`: HTTP 200, correct page title, September 9 date, neither retired name spelling nor visible waiver version codes.
- Previous deployment retained: `dpl_3sZdp7tY9Yb8VF3ag6h9gCN2yk5K`.
- Error-log scan after promotion: zero returned error entries in the requested 10-minute window. This is a bounded observation, not monitoring certification.

## Verification boundaries and outstanding work

Final checks: 332 mobile tests across 77 files passed; 104 web tests across 28 files passed; workspace type checking, web lint, and mobile source validation (138 modules, zero errors) passed. The current QA iOS Release build succeeded.

Native smoke results: eight passed, zero failed, three skipped to preserve the existing draft (`/tmp/lb-native-smoke-20260909-084633.xcresult`). A separate current-build waiver test passed after recovery (`/tmp/lb-waiver-20260909-0904.xcresult`), including scrolling to the readable date, keeping acceptance disabled without consent, and returning to report details. [Waiver screenshot](assets/2026-09-09-follow-up-implementation/waiver-readable-date.png). The original denied location permission was restored, simulated GPS cleared, and only the intended iPhone 17 Pro simulator remains running with the normal QA app.

No live payment, waiver acceptance, cleanup claim/decision, publication, moderation action, or personal-profile save was submitted by this work. A separate Supabase project and Stripe test setup are still required for payment success/decline/refund/payout and two-account claim-to-approval tests. The user was asked for the isolated project name while implementation continued. A fixture-only map app cannot certify those financial workflows.

The main QA app is `com.gegibson.litterbugs.qa` on iPhone 17 Pro `49C7B41E-83FD-42F0-853F-3A4BA7B62C9A`. It is separate from LB Fixtures. An existing report draft caused three creation/draft native checks to skip; the draft was preserved and those checks are not counted as passes.

The September 9 08:51 SpringBoard crash report identifies `XCTAutomationSession` on the faulting thread at the end of the native session. It was a simulator home-screen process crash, not a recorded Litterbugs crash. The simulator was restarted without uninstalling the app or deleting its data.

Native transaction outcomes, the skipped existing-draft cases, fresh smaller-device/maximum-text coverage of every changed workflow, real-device GPS, VoiceOver, and Android remain explicit verification gaps. The audit’s entire journey matrix is not being relabeled as fully verified.
