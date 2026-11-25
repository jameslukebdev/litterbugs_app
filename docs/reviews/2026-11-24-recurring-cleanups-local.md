# Recurring cleanups — local website implementation

November 24, 2026. Owner authorized a local-server build and explicitly prohibited
deployment. Website first; native apps and release work remain pending.

## What is running locally

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
