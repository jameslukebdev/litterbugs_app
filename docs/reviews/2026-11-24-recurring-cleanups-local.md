# Recurring cleanups — local website implementation

November 24, 2026. Owner authorized a local-server build and explicitly prohibited
deployment. Website first; native apps and release work remain pending.

## Current checkpoint — real local website (supersedes fixture notes below)

Source8e904b9. The owner's latest instruction was to use the actual local website,
not examples. Open http://localhost:3000/cleanups . Actual public report rows and
photos come from existing anonymous hosted reads. The real completed report
`e930e42c-a238-4786-b0e5-dd0ce1e5b319` now has Needs cleaning again below Reported by.
Its normal five-step form requires new photos; existing cleanup evidence is retained.
The real site overview is http://localhost:3000/sites/e930e42c-a238-4786-b0e5-dd0ce1e5b319 .

New recurrences use authenticated permanent members and fresh GPS within the usual
report distance. The server derives the author from getUser, strips photo metadata,
and stores actual local submissions under the temporary directory
`litterbugs-local-website-sites`. This is separate from the retired fictional store.
Writes are serialized across server bundles, competing submissions return the
existing report, and retries preserve a committed occurrence and its original photos.
Photos/read models recheck the real public source, including its nonempty title.
No hosted report, photo, money, notification, email or moderation write is made.
Local-only new reports cannot start hosted fund/claim transactions; those complete
lifecycle paths still require an isolated Supabase integration environment.

Normal /cleanups and /reports group explicit site identities before pagination.
No existing nearby reports are inferred to be one location. A completed site remains
in /cleanups when new litter is reported; its card shows New litter reported and
opens the site overview. The latest open occurrence appears once in /reports.
The site overview contains the full combined Timeline; original occurrence pages
keep their own Timeline, original self canonical and a site-history link. Each
original dated story/evidence URL remains addressable. Singletons retain the
original report card URL/canonical. Prepared site overview sitemap rows supplement
original report URLs only for recurring sites, with real recorded modification dates.
The grouped directory/history RPC migration remains prepared and unapplied.

CUA verified real directories and actual form open/close, actual overview, cleanup
evidence expansion and a390x844 rendered viewport (innerWidth390, document375,
one Timeline). Viewport restored. Final browser errors empty. No fabricated litter
report was submitted at a real location during browser QA. Isolated API/store tests
cover fresh photos, real-member identity, auth/host/origin/location rejection,
concurrent requests, idempotency and deployed-environment storage isolation.
Focused UI/feed/SEO/sitemap/privacy suites and existing report/wizard regressions
pass; full TypeScript and scoped ESLint pass. Disposable PostgreSQL ran the actual
migration and original publish_report, including grouped directory pagination,
current/completed identity, draft/moderation exclusion and unchanged prior finances.

Evidence: /tmp/litterbugs-recurring-cleanups-20261124/real-cleanup-desktop.jpg and
real-site-phone.jpg. Existing local dev server retained; sequential tests, no new
simulator/server or production build. Disk had about10GB available at the last check.
Release gates still include isolated hosted lifecycle/media integration, durable
edited-draft recovery, map/list consolidation, native implementation and release QA.
No deployment/hosted migration/OTA/publication was performed.

## Historical first checkpoint — illustrative store (retired from actual website)

## What was running in the first checkpoint

- Existing public report page and map detail integrate ReportSiteActivity.
  One Timeline groups each report's reported/donation/claim/cleanup events,
  retaining the existing ordering, labels and mint markers. A completed event
  expands to its own before/after photos and impact.
- Needs cleaning again uses the existing five-step ReportWizard with the location
  retained, a fresh photo set and fresh litter/severity choices. It creates a
  separate occurrence, never resets the previous report.
- The normal backend adapter reserves the linked report, uses the existing secure
  media upload and GPS-checked publish_report RPC, and keeps an uncertain-publication
  journal. A server duplicate opens the current report with an inline notice.
- A missing recurrence RPC on an older backend leaves the existing public Timeline
  available and hides the new action. No hosted schema was changed.
- The review dataset uses reserved f0000000-0000-4000-8000-* IDs, process-local
  serialization and an atomic JSON file under /tmp/litterbugs-recurring-cleanups-local.
  Uploaded review photos are decoded, resized and metadata-stripped locally.
  No production upload, AI review, fund, claim, payout, email or notification is
  initiated by submitting this dataset. Jamie/Alex/Riley/Morgan and these repeated
  events are illustrative. Local mode uses a fixture actor, not real Auth evidence.
- Start at http://localhost:3000/reports/f0000000-0000-4000-8000-000000000002 .
  A local Jamie report was submitted during QA; the old page now links to it.
  Its ID is in the verification JSON. Prior report URLs remain available.

## Prepared schema — not applied to hosted Supabase

20261125013903_recurring_report_sites.sql adds a stable site ID and previous-report
link to reports, plus reserve_site_report and an RLS-respecting history ID query.
No client INSERT/UPDATE grants on the linking columns. New reservations use the
authenticated submitter, source coordinates and ordinary zero-fund defaults.
Site advisory locks at reservation and publication prevent two current reports.
The ordinary publish_report remains unchanged and still checks ownership, fresh
GPS and owned prepared evidence. Removed/sample/anonymized sources are excluded.
No prior report, contribution, reward or cleanup attempt is modified.

The existing report lifecycle publishes after its normal secure-media/location
checks and separately requests funding review; the earlier visual prototype's
manual approval switch is not a new production moderation stage.

## Validation and limits

- 88 targeted web tests pass, including the new activity/model tests, existing
  report page/detail/facts and resumable wizard checks. Full TypeScript and scoped
  ESLint pass. No production build was run after the memory alert.
- Actual prepared migration and existing publish_report SQL pass on disposable
  loopback PostgreSQL: new/old reporter identity, zero new fund, idempotency,
  permanent-account gates, wrong-owner/photos rejection, protected linking columns,
  duplicate publication/reservation, private draft/moderation visibility and
  untouched earlier donations/rewards/cleanup rows. No hosted connection.
- CUA verified the complete local form, server save, navigation, full reload,
  retained Timeline, old evidence expansion and clean final browser console.
  Evidence: /tmp/litterbugs-recurring-cleanups-20261124/ .
- IAB's attempted390x900 viewport override left DOM width1265; narrow rendered
  verification remains pending and is not marked passed.
- The fixture filesystem backend and SQL checks do not prove live Auth, quarantine,
  AI/funding review, notifications, payment or cross-device integration.
- Before release: harden durable recurrence form recovery (including edited inputs
  after uncertain submission), map/list consolidation across occurrence IDs,
  full hosted-path integration against an isolated backend, broader schema lifecycle
  checks, narrow rendered QA, and native app implementation/verification.
  This checkpoint is for local review, not release readiness.

## Owner memory alert

The Mac approached disk exhaustion while the existing Next cache grew to4.2GB.
Removed that generated Turbopack cache, leaving source/assets/data untouched; the
owner's dev launcher restarted localhost3000. No second server was left running.
At the owner's memory-management request, shut down the booted test iPhone17 Pro
49C7B41E-83FD-42F0-853F-3A4BA7B62C9A via simctl without erasing it. Its background
processes exited. Approximately8.4GB disk was then available. No personal Chrome
or Claude session was closed. Subsequent verification was sequential.

Website00ed676 and email OTA group5c8ab976-b063-4497-b5be-d15045622988 remain live
and unchanged. No migration, deployment, OTA, store change or send was performed.

## Action placement follow-up

Needs cleaning again now sits in the public page action stack below Reported by.
An older report with an active successor instead shows View latest report there.
Removed the redundant cleanup-count jump row; the count remains beside Timeline.
The actual site result is fetched on the server and passed to the two renderings,
with a single visible Timeline. Archived QA data in the OS temp directory to
restore the cleaned review fixture; old data is preserved in reports-before-layout-review-*.
The prior local QA occurrence URL is therefore currently archived, not public.
19 activity/page tests, TS/lint and CUA open/close/one-Timeline checks pass.
Current screenshot: /tmp/litterbugs-recurring-cleanups-20261124/corrected-actions.jpg.
SEO recommendation is recorded separately; no SEO routing/canonical changes.

## November25 verification update

Source `d56f7c3` completes local full-stack lifecycle, interrupted/edited retry recovery and map grouping checks. Completed-page/map actions have been simplified and visually verified on real reports. See [full flow evidence](2026-11-25-recurring-cleanups-full-flow.md). Earlier hosted-path/draft-recovery/map-consolidation pending notes are superseded by that bounded verification; external provider sends/payments and native work remain unverified. Release hold remains: nothing deployed, prepared migration not applied hosted.
