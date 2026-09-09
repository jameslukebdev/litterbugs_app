# September 9 audit implementation

Implements the thirteen recommendations in [the September 8 audit](2026-09-08-comprehensive-app-audit.md). The normal app retains the existing compact green design and GPS-free report pin workflow. Fixtures remain a separate simulator-only application.

| Recommendation | Implementation |
|---|---|
| 1. Larger text | Marker text and collision bounds use the same explicit system scale to prevent double-scaling/truncation; growing headers; full-width report action and separated map controls at accessibility sizes; stacked profile identity/activity choices; scrolling password reset and wrapping payment rows. |
| 2. Recoverable publication | Persisted submission ID and photo progress; reserve a private report, upload evidence, then publish. Retries reconcile the same ID, including a lost publication response. Server validates evidence ownership and storage presence. |
| 3. Pending payments | Authenticated provider-status endpoint, authoritative success/cancellation reconciliation, checked timestamp, and distinct incomplete/processing/unverified explanations. Age alone never means failed or charged. |
| 4. Payment ownership | Funding and payout controllers keyed by account/report/workflow; stale async work cannot populate a replacement controller or open its payment sheet. |
| 5. Loading and retry | Blocked and expired reports use account-scoped resources with persistent Retry, confirmed empty states, and retained data on refresh failure. |
| 6. Review lifecycle | Focus/foreground refresh, cleanup-specific state, retry, reset choices on cleanup change, and correction deadline checks before editing. |
| 7. Draft recovery | Resume the last valid stage; explain missing local photos; show Continue draft and saved time in personal activity. |
| 8. Photo reliability | Shared RemotePhoto component for preview/list/gallery/review evidence; separate loading, absence and failure; refresh signed URLs on retry; discard obsolete requests. |
| 9. Activity navigation | Explicit Current cleanups, Cleanup history and My reports labels, plus Browse reports from the empty current-cleanup state. |
| 10. Moderation context | Optional explanation for every reason, required for Other; retain explanation when reason changes; protect unsaved text and duplicate taps. |
| 11. Performance | Geographic budget of 1,000 reports with visible notice; abort stale fetches; native projection batches of 40 with cancellation; virtualized contribution and public-profile histories. |
| 12. Report polish | Neutral photo guidance, spacing before optional title, and Next: Details / Next: Review actions. |
| 13. Architecture and checks | Extracted submission coordinator/store and shared photo/resource behavior; source identifier check; separate native suites and a runner that rejects skipped coverage and restores text size/location. |

## Backend rollout

Applied `20260909085746_recoverable_report_publication.sql` to Litterbugs project `mvaygkflcjswtwchflrk`. Deployed `check-contribution-status` and the refactored `stripe-webhook`. The new status endpoint validates the signed-in owner even though gateway JWT verification is disabled for this endpoint. An unsigned request returned 401.

Existing reports default to published for compatibility. Public discovery and personal report lists explicitly exclude private submissions, including the website's shared-schema readers. Regenerated database types preserve the project's type aliases.

Five local migration filenames were aligned with the already-applied remote versions after their SQL was compared. No historical SQL was reapplied. The unshipped waiver-v3 SQL was preserved under `supabase/rollout/`; this task did not publish that legal acknowledgment.

## Verification

- 316 mobile JavaScript tests passed across 73 files.
- 104 website tests, workspace TypeScript checks and website ESLint passed after shared-schema compatibility updates.
- Largest accessibility-text native map checks passed without skips on iPhone 17 Pro and iPhone 13 mini.
- Source identifier/JSX check: 133 mobile modules, zero errors.
- Computer-use checks opened both September 2 pending attempts: Stripe verified each as Not completed, with a checked timestamp, $25 contribution and $2.50 fee ($27.50 attempted total). No payment was submitted.
- Edge-function type checks passed; 16 financial helper tests passed.
- Rollback-only SQL verified private/public visibility, stable reservation, evidence rejection, valid publication, and exactly-once profile counting against the deployed schema. Test rows were rolled back.
- Security advisors had the same warning counts before and after deployment; pre-existing warnings remain.
- Both isolated native fixture cases passed without skips: density/zoom/coincident selection and all status/funding filters.
- Computer-use verification confirmed the complete $6 label at the largest text size after aligning marker font/layout scaling. See [map](assets/2026-09-09-implementation/map-largest-text.png) and [profile](assets/2026-09-09-implementation/profile-largest-text.png) screenshots.
- All nine normal-app native smoke tests passed without skips, including marker selection/pan/zoom, Map/Reports synchronization, independent personal reports, payment-history navigation, profile alignment/keyboard/Back, GPS-free report entry, three-stage review and draft recovery.
- Deterministic label-layout CPU samples: 1,000 = 39.2 ms (cold), 5,000 = 9.5 ms, 10,000 = 23.1 ms. These are desktop JavaScript samples, not device render, network or memory measurements. The app renders at most the geographic budget rather than 10,000 native annotations.

## Verification boundaries

No real payment, payout, report publication, cleanup decision, moderation report or account change was submitted. Financial provider-outcome combinations and interrupted native uploads still require isolated end-to-end sandbox coverage beyond the coordinator/SQL tests. Device memory, real GPS, Android and VoiceOver are not certified by this iteration. Lost photo-upload responses can require re-uploading a photo, while the stable report ID prevents a duplicate published report. The map screen still coordinates navigation; the controller extraction is incremental.

The normal QA app is left open on iPhone 17 Pro at standard text size. The temporary iPhone 13 mini is shut down; synthetic GPS is cleared and the prior location-denied permission state is restored.
