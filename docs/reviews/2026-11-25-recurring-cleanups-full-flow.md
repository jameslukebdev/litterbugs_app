# Recurring cleanups: local website verification — November 25, 2026

Source: `d56f7c3` on `codex/recurring-cleanups-local-20261124`, after `ff652d2` and `8e904b9`.
Worktree: `/tmp/litterbugs-site-history-preview-20261124`. Explicit owned files are mirrored into the shared localhost checkout. Other assistants’ changes are preserved.

## Result and release hold

The local website reporting → claim → cleanup evidence → reporter approval → new reporter recurrence path passes. Two full cleanup cycles also pass against a disposable full local Supabase stack. The completed page/map action layout has been verified against real published report reads after restoring normal localhost.

Nothing deployed. `20261125013903_recurring_report_sites.sql` remains **NOT APPLIED to hosted Supabase**. Live website `00ed676`, mobile OTA group `5c8ab976`, store builds and native source are unchanged by this work. Native implementation/testing is the next phase and remains separate.

## Design decisions and reference lock

- Existing Litterbugs white, photo-led layout, Nunito typography and bug artwork remain the dominant design source.
- Refero: Airbnb styles `2b556363-5cb0-443f-a550-7273d108fea9`, Buy Me a Coffee styles `2c2500c8-ff34-4bd1-8cec-aef76ab75df1`; Airbnb listing screens `0ab0c28a-d43d-4c1e-86c3-b7841afc53bf` and `afc4a009-121a-4a8c-a8f8-4accb747ba8c`. Adapted only compact Share near the heading, apart from the main task.
- [GOV.UK buttons](https://design-system.service.gov.uk/components/button/) and [NN/g button hierarchy](https://www.nngroup.com/articles/button-states-communicate-interaction/) informed the single prominent recurrence action and quiet Share utility.
- Removed “Find another cleanup” from completed pages. Share opens the existing dialog and keeps its full accessible name.
- “Needs cleaning again” now uses the existing Report Litter dragonfly and blue family: `#f2f7ff` fill, `#9bbbf3` border, `#2e539e` text. Mint completed badges and cleanup styling stay intact.
- Map panel: reporter and recurrence action are together in the padded header. Timeline is inside the padded detail body after the report facts and before the app/ID footnote. There is one Timeline. No extra explanatory product copy was added.

## Bugs and behavior corrected

1. Ordinary drafts serialize unused choice arrays as JSON null. The prepared reserve RPC now normalizes null to empty arrays, rejects non-arrays and retains the ordinary workflow validation.
2. Recurrence publication had reused an ordinary-report journal whose owner/path rules rejected the namespaced record and empty pre-upload paths. Separate recurrence journal helpers preserve real owner/source IDs, File bytes and submission identity without consuming an ordinary draft.
3. Before retrying, check whether the previous report was already published. A changed form/photo fingerprint gets a new private reservation only after ruling out an uncertain commit; old metadata/photos cannot be silently published under an edited form.
4. Actions and Timeline refresh on the existing data-change clock; their simultaneous public reads share one in-flight promise, discarded on settlement. Approval can expose the renewed-report action without reloading.
5. The default map/report browser chooses the newest explicit linked-site representative before query/severity/funding matching and before the result cap. Completed filtering retains the latest completed occurrence. Favorites/hidden keep their report-specific semantics; nearby locations are never auto-merged.
6. A full loopback Supabase stack bypasses the dev disk overlay. Normal localhost with hosted public reads still keeps recurrence writes in the isolated disk overlay.

## Verification

- 145 targeted web tests passed across report page/detail/activity, cleanup actions/review/submission, media processing/upload, local store and discovery. The subsequent focused activity/discovery run passed 22 tests, including a new approval refresh + single-read check (146 distinct tests across those suites).
- Full TypeScript and scoped ESLint passed. After switching local backends, a stale generated Turbopack manifest briefly returned 404 for existing routes and produced invalid generated types. Restarting with a fresh dev cache corrected it; TypeScript and rendered routes passed afterward. The retired 4.2GB generated cache was removed.
- `node scripts/test-recurring-report-sites.mjs` passed in its disposable native PostgreSQL, including JSON-null drafts, invalid arrays, ownership, duplicate/race guards, privacy and unchanged financial identities.
- Opt-in integration test: `apps/web/integration/report-cleanup-flow.test.ts`, enabled with `LITTERBUGS_LOCAL_FLOW_CONFIG=<private loopback config>`; strict port62331 guard and external-network denial. Passed using real GoTrue sign-in, PostgREST/RLS, Storage/quarantine, actual web media decoder/sanitizer/promotion, publish/claim/submit/review RPCs, two cleanup cycles, grouped directories/map, original attribution/evidence, and SSR of the real SitePage. It also covers edited retries, an interrupted publish, a lost response after successful commit, duplicate recurrence and anonymous before/after photo reads.
- Existing SQL `mobile_report_workflows.sql`, `routine_cleanup_approval.sql`, and current-GPS publication checks passed in the appropriate local transaction context. Old isolated-only/bootstrap SQL files were not treated as current-stack release gates.
- CUA browser: published a normal five-step report with blank optional notes; separate cleaner claimed and submitted after evidence (2 bags,4lb,30min); original reporter reviewed and approved; a third member published recurrence with fresh evidence. Site page showed the new reporter and preserved the first cleanup/evidence.
- CUA recovery: deliberately blocked the local media endpoint, reloaded, reopened the saved report at Review with File/answers intact, cleared the block, and published successfully. Actual IndexedDB round-trip was used, not the integration test’s journal adapter.
- Normal real-report review restored: actual Hobby Lobby completed page/map, updated action, inset Timeline, existing Share dialog and390px responsive width; no horizontal overflow. Viewport reset and final page console had no errors.

## Test isolation and limits

Full stack used a fresh local DB `litterbugs_fullflow_20261125`, with baseline + all103 repo migrations and current GPS/waiverv4 rollout flags. Dedicated Auth/REST/Storage/Kong services bound only to127.0.0.1:62331, separate Storage volume; no hosted writes. Bootstrap included standard auth/storage grants and the `is_permanent_user()` anonymous execute grant already present on hosted (verified read-only: anonymous RPC returns false). The local omitted grant initially caused public-photo403s; adding that same local grant resolved them without changing hosted policy.

External malware/content verdicts were deterministic local fixtures, while real image processing and storage ran. Browser GPS was synthetic. Current waiver acceptance was seeded for QA accounts; no real member’s agreement, account deletion, payment or payout was exercised. Funding/security regression tests ran, but no real Stripe transaction, provider delivery or notification send occurred. This is not a claim of live provider verification.

Test gateway services and Colima audit VM are stopped. Prior cron settings (`database_name=postgres`, `launch_active_jobs=on`) were restored in the local Postgres configuration before shutdown. Normal localhost3000 is restored to the original hosted-read development configuration with no provider fixture preload. Browser network/GPS overrides cleared; QA sign-in removed; the existing normal localhost account remains. One Next dev server remains, no simulator started.

Evidence (OS temporary directory; not production assets):
`/tmp/litterbugs-cleanup-flow-20261125/real-map-action.png`
`/tmp/litterbugs-cleanup-flow-20261125/real-map-timeline.png`
`/tmp/litterbugs-cleanup-flow-20261125/real-completed-page.png`
`/tmp/litterbugs-cleanup-flow-20261125/real-completed-phone.png`
`/tmp/litterbugs-cleanup-flow-20261125/browser-recurrence-history.png`
`/tmp/litterbugs-cleanup-flow-20261125/browser-restored-draft.png`
`/tmp/litterbugs-cleanup-flow-20261125/browser-recovered-publication.png`

Private local API/user configs remain mode0600 under that temp directory and are not committed. No screenshots/test photos, generated output or credentials are included in the source commit.

## November25 website release-readiness check

The optimized production build of `d56f7c3` passed locally using the default Next16.3 Turbopack bundler: compilation, TypeScript and all37 static pages, with one page worker. Existing social-card filesystem tracing warnings remain inherited. Evidence: `/tmp/litterbugs-website-readiness-20261125/production-build-final.log`. Initial local setup attempts lacked nested test dependencies and the secret-redacted public project key; completing that local setup resolved those failures without source changes. Build used existing public Supabase project credentials because Vercel excludes Secret values from environment pulls. No production preview/runtime is claimed from this build alone.

Candidate ancestry includes live website `00ed676`; no mobile source or Edge Function files differ. The migration adds site columns/defaults/indexes, narrow new functions and a recurrence-only publication guard. Existing publish/claim/review signatures stay intact; ordinary reports bypass the recurrence guard. The already recorded local lifecycle/finance-identity checks still apply. Native apps continue their current per-report interface until native work is separately completed; the shared backend additions are part of the website release.

Implementation readiness: **ready for website release**. Operational access: **Vercel CLI authentication needs refreshing**. A read-only env pull rejected the saved token; whoami had no usable login and opened a device flow, which was stopped without granting credentials. No environment value, hosted schema, deployment, domain, mobile build or OTA was changed. Before publishing: restore Vercel access, stage the production-environment build, apply only the prepared migration in a guarded transaction, verify backend compatibility, promote and smoke-test. Keep the additive schema/history on any website rollback. Publication has not been requested in this readiness question.
