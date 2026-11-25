# Returned-litter mobile OTA readiness — November 25, 2026

**Publication update November25:** owner approved and both frozen OTAs are now live in group `63bc12bc-4571-4650-8ed2-954de6bee32f`; native verification is continuing. Preparation/hold notes below are historical.

**Prepared, NOT PUBLISHED.** Grant authorized implementation and simulator/emulator
checks, with publication held until a later approval. No EAS update command,
preview publication, store build/upload, website deployment or hosted schema change
was performed for this mobile task.

## Frozen candidate

- Source: `279767621a548220c47658efeaf1a13d03bb3f05`.
- Branch: `codex/recurring-cleanups-mobile-20261125`.
- Isolated checkout: `/tmp/litterbugs-recurring-cleanups-mobile-20261125`.
- Both production Hermes exports, source maps and assets are under
  `artifacts/mobile-recurring-cleanups-20261125/` in the shared workspace.
- Runtime2.1.1 / production channel / project
  `df0d0855-71d9-4943-b278-d1f083ab6b06`; no native/runtime/version/dependency changes.
- Current LIVE OTA remains group `5c8ab976-b063-4497-b5be-d15045622988`,
  EAS source `3db81d5e582788635fe7067ea40f4c2e538dddda`.
  iOS `01a2101d-affe-71ae-91a6-3520ab426438`;
  Android `01a2101d-affe-7799-af82-c27f73cba200`.
- Website `ba1feca` and its already-applied
  `20261125013903_recurring_report_sites.sql` support these clients. This task
  added no backend rollout or migration requirement.

## App behavior

The opened report detail now has one Timeline directly below Reported by, before
the existing cleanup controls/story. Cards retain their existing layout. Dates,
original reporters, donated amounts and donor privacy, cleanup attribution,
before/after evidence and removal metrics stay attached to their original report.
The UI reuses the approved website pattern, existing Nunito/bug artwork and mint
completed badge; Needs cleaning again uses the dragonfly and existing blue tokens.

A completed site can open the existing five-step report form at that location.
The new reporter owns the new report, supplies fresh photos/types/severity and
follows normal GPS, photo review, funding, claim and cleanup handling. The site
location cannot be moved from this renewal form. Old cleanup/funding/evidence
records are retained, with explicit site linkage rather than proximity merging.

Returned-litter drafts and recoverable submission journals are separate from
ordinary drafts and other sites/accounts. Repeated taps share one submission;
partial uploads resume, lost successful responses reuse the published report, and
edited uncommitted inputs receive a fresh reservation. A duplicate/race opens
the server-selected current report with its actual reporter instead of posting
another report. History refreshes on foreground, every30 seconds while open,
after status changes and on retry; failed reads suppress the renewal action.
Blocked reporters are excluded from the displayed history/navigation.

Map/browse chooses the newest explicit site occurrence before detailed filters
and result caps. Completed filtering keeps the latest completed occurrence;
favorites/hidden remain report-specific. Nearby independent reports remain
independent. Earlier rounds remain accessible in Timeline.

## Validation and preservation

- Full mobile suite: **705 passed /1 existing skip**,128 passing files/1 skipped.
-236-module source check, scoped ESLint and diff whitespace checks pass.
- Focused native model, activity, draft and submission tests:37 passed. Includes
  ownership, duplicate recovery, edited retries, interrupted uploads, ordinary
  draft/evidence preservation in both directions, account-local purging, donor anonymity, blocked history, foreground
  refresh and latest-site selection across fetched pages.
- Both **full production app** exports passed using existing EAS production env,
  fresh Metro cache and one worker. Production config/backend/runtime assertions
  passed.78 exported file hashes verified by both offline helpers.
- Compared with the exact live OTA:425 inherited source files unchanged, zero
  removals; all67 prior assets per platform byte-identical. The $35 tutorial,
  funder/privacy/heart/email implementations, shared contracts, app/native config,
  assets, package manifests, lockfile and native patches are retained. Unchanged
  feature files are not selectively re-created from a website branch.
- Production bundles contain the correct backend and exclude the QA entry's dummy
  endpoint/key/text and local test gateway URLs. Generic SDK development strings
  are not treated as actual configured endpoints.
- Final readback confirms channel ID/mapping and both live update IDs/group are
  unchanged. `publication-hold.json` explicitly records NOT_PUBLISHED.

The first unpublished export (`b18dda0`) was superseded before approval after a
final cross-check found that ordinary draft cleanup could remove nested site
photos. The final store uses its own `site-report-drafts/<user>/<site>` directory
and account-scoped keys. Regression checks prove clearing either draft type
preserves the other. Deleted-account local purging drains the new queue and
removes its keys/evidence; a retired account cannot recreate a submission journal.
Only local cleanup tests were run, with no real account deletion. The archived
first export is explicitly marked `SUPERSEDED_DO_NOT_PUBLISH`.

## Native checks and limits

Ran devices sequentially using existing2.1.1 native code, with analytics and OTA
checking disabled **only in local QA copies**. Production export keeps normal
analytics and silent updates. iPhone17Pro/iOS26.5 used separate bundle ID
`com.litterbugs.sitehistoryqa`. Android/API36 used a disposable COW clone
`SiteHistoryQA`,1024MB RAM/two cores and local QA signature;87 native/DEX files
were byte-identical to the original shell. Original installed apps, sign-in and
emulator data were retained. Owned test devices were stopped; free memory measured
65% immediately after shutdown.

The QA entry imports the actual ReportSiteActivity, ReportWizardModal and wizard
navigation, reading the **real public** Hobby Lobby cleanup. On both platforms:
Timeline/date/reporter/cleanup rendered; before/after evidence and metrics loaded;
renewal opened with no old photos and disabled Next; selecting a new picker photo
and required choices advanced through all five steps; Review retained the fixed
site and selected answers; cancelling returned to the unchanged history. Android
error log contains zero lines. Local QA signing remains outside the production
Google Maps certificate restriction, so Android Review map tiles are unavailable.

This is a bounded native UI harness, **not the full App/MapScreen bootstrap or a
native real-provider publication test**. The complete production App/MapScreen
bundles compile, their loading/detail tests pass, and publication/recovery service
logic has focused tests. The website's earlier real local GoTrue/RLS/Storage two-
cleanup-cycle integration and browser flow cover the unchanged backend contracts;
no new claim is made of native live report submission, payment/provider delivery,
waiver acceptance or account deletion testing. No real report was posted, no
photos uploaded and no hosted account/data change was needed for these UI checks.

The native UI was checked at `b18dda0`; source comparison proves all component,
MapScreen and QA UI code is identical in the final candidate. The subsequent
storage-only correction passed the full705-test suite and both fresh production
exports. The review screenshots remain valid for the unchanged UI.

Actual updater download, activation and relaunch of this candidate remain pending
publication approval. No unapproved preview update was used as a shortcut.

## Publication and recovery

Before approved publication, use the isolated candidate/source bundle and frozen
`dist`, not the dirty shared checkout. `scripts/prepared-mobile-ota.cjs` defaults
to offline verification. Its explicit `--publish` path rechecks source/artifact
hashes and stops if the live channel baseline changed. Use EAS production env;
never re-bundle a different checkout during publication. Publication to both
platforms is a separate, currently unauthorized step.

Recovery after any later release republishes the prior `5c8ab976` OTA group.
Do not roll back to embedded code, which would discard the earlier OTA features.
Keep the already-live additive site schema and all historical report/evidence/
financial records. Existing provider-testing exclusions remain unchanged.

Evidence: `readiness.json`, `preservation.json`, `verification.json`,
`publication-hold.json`, `native-verification.json`, channel-before/after JSON,
`evidence/` screenshots/test logs, and the source bundle in the artifact directory.
The shared checkout's unrelated location-recovery/mobile and website edits were
preserved; the release candidate stays isolated and committed.
