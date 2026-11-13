# Litterbugs website and app analytics — local review

Grant requested a custom owner dashboard combining Google Analytics, Google
Search Console, PostHog and Clarity, rather than embedding the PostHog dashboard.
He subsequently requested the unreleased app analytics from the parallel
“Finish mobile analytics verification” chat. Overview / Website / App views keep
both surfaces distinct while using the same7/28 complete-day period control.

## Local page and access

`http://localhost:3000/admin/analytics` uses the existing cleanup-admin membership
and authenticator requirements. The server checks authorization before fetching
or serializing reports. `/admin` links to it; the moderation inbox remains intact.
No public API or client-side provider credentials. No new DB tables or migration.

## Design lock and decisions

Primary target: existing Litterbugs website, white canvas, dark ink, purple
actions, lilac rules, playful Nunito headings, mint secondary actions. Existing
user preference for fewer enclosing boxes controls the composition.

- Refero Fathom style `a1029801-bc83-416d-b027-459cdfb2865c`: flat, spacious
  sections and small accent roles. Retain existing tokens, reject its green-grey
  background and marketing illustrations.
- Refero Pitch style `f8a73a93-7312-4845-a507-2a511b5b8de2`: compact working
  controls within generous section rhythm. Reject purple theatrical backgrounds,
  lime, display-scale typography and collages.
- Refero Visitors screen `dfd70774-b7e3-415e-bab8-ee1b9bf452f1`: date selection,
  scannable metric strip, large trend area and adjacent breakdowns.
- Refero Pop Site screen `5d24f428-3248-4212-81b3-54d11c565443`: source breakdown
  paired with timeline. Reject enclosing every metric in a shadowed card.

Four owner questions: where visitors come from, whether they explore, whether
search visibility improves, where participation gets stuck. Only the map-reach
callout gets a tinted panel. Metrics link to their page sections; source links
are drilldowns rather than the dashboard itself. No decorative imagery needed.

## Source definitions and coverage

- GA property561329300, production hostname only. Sessions/users/views are GA's
  definitions, using its property dates. Daily users must not be summed to get
  period users. Top8 acquisition channels. GA's configured internal filters apply.
- GSC `sc-domain:litterbugs.app`, final web-search results, ending3 days ago in
  Pacific time. Query-free total query supplies totals; top8 query rows are
  incomplete because of anonymized searches. CTR uses total clicks/impressions.
- PostHog project695338: predefined native TrendsQuery with full-period distinct
  sessions for pageviews and map pageviews, same-source denominator; direct map
  landings included. Other stage session counts are independent activity, not an
  ordered funnel or all-platform totals. Failure counts are events. Map failure
  absence is not health evidence when no map-start telemetry exists.
  Production host, identified tests/bots/.invalid QA referrers excluded, existing
  filterTestAccounts applied. Older unmarked staff visits can remain. Existing
  catalog definitions are proposed, not canonical. No PostHog objects changed.
- Clarity z60itnrbpn: recent3-day view independent of7/28 day controls; rage,
  dead-click, quick-back and script-error session counts may overlap. Signals
  are investigative leads, not automatically confirmed bugs. The live export
  covers rolling72 hours, UTC; a browser snapshot uses the UI's displayed dates.
- App: same PostHog project, surface=app AND app_environment=production,
  $is_emulator!=true, existing test flags and filterTestAccounts. Independent
  event counts for launches, reports published, cleanup claims, evidence,
  approvals observed, failures and sign-ins. Foreground-only median timing and
  sample counts for report_details and launch_to_map. Photo links/status ready
  does not mean rendered pixels; map-first timing starts after native startup.
  No data means awaiting release, not a reassuring row of zeros. Anonymous
  install IDs are not people or cross-platform account identities.
  Native crashes can lack surface/environment/OTA tags. They are explicitly
  unclassified pending a verified namespace/build production release allowlist;
  the app product filter must not silently represent all native crashes.
  Notification/shared-link attribution and staff opt-out completion remain owned
  by the mobile thread; no edits to its mobile code or project settings here.

Missing data is a dash, never zero. Zero comes only from a successful report.
No cross-provider identity join or sum of visitor counts. No automatic permanent
abandonment inference from an exit. No claimed-to-approved equivalence.

## Connections

Connected assistant tools and signed-in Chrome can read reports during local
review. Their access is not automatically granted to the deployed web server.
Real aggregate review snapshots live in gitignored
`apps/web/.analytics-local/snapshot.json`, read only in development. UI labels
them as dated local snapshots; changing periods never relabels a snapshot's dates.
They are not bundled, committed, or read in production.

`node scripts/refresh-owner-google-analytics.mjs [--days=28]` refreshes local
GA/GSC snapshots through the existing SEO CLI Google connection. It does not
copy OAuth secrets. Bounded calls preserve previous data and timestamps on error.
Other provider snapshots are imported from reviewed connected-tool/UI results;
they do not auto-refresh.
GA's existing CLI report requests returned upstream errors even though its
signed-in UI works. GA UI snapshots can therefore include only directly observed
session totals/channels, with users/views null and daily trend absent. They are
property-wide, without an extra hostname filter, and are explicitly labeled so.
Do not mislabel active users as total users or derive unique users by summing days.
Google collector totals explicitly pass dimensions=[] to override the CLI's
default landing-page/query grouping; search totals must reconcile to daily clicks.

Admin pages never mount visitor analytics. Visiting admin also saves the existing
browser exclusion keys, so subsequent staff use is not visitor traffic. If an
already running Clarity recorder exists after an SPA transition into admin, a
fresh private document resets it; the private view is also masked defensively.
Normal visitor defaults and provider settings remain unchanged.

For automatic server-side reporting, provision these **server-only** settings:

- `ADMIN_ANALYTICS_GOOGLE_SERVICE_ACCOUNT`: dedicated Google service-account JSON
  with GA Viewer access to561329300 and GSC read access to litterbugs.app. Enable
  Analytics Data API and Search Console API in its Google Cloud project. No domain
  delegation or owner Google OAuth token is needed.
- `ADMIN_ANALYTICS_POSTHOG_KEY`: private read-scoped key restricted to695338,
  permitting query reads; never the public capture token.
- `ADMIN_ANALYTICS_CLARITY_TOKEN`: project data-export token from Clarity settings.

These were not found in the app's environment at implementation time. No new
credentials, permissions, invitations or provider settings created automatically.
Do not claim automatic live collection is configured until real calls pass.

Provider calls run in parallel and fail independently. Server caches GA/GSC/
PostHog aggregates15min; Clarity6h, same key across7/28 selections, including
failure responses to avoid exhausting its10 calls/project/day quota. This is
best-effort cache throttling, not a distributed quota ledger: redeployments/cache
eviction can cause extra calls. Before production enablement, use a persistent
scheduled ingestion store for a strict daily quota and retained Clarity history.
Live adapters require credentialed validation against the real first responses,
especially Clarity's metric fields; absent/unrecognized fields remain unknown.

## Primary API references

- https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport
- https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- https://developers.google.com/identity/protocols/oauth2/service-account
- https://posthog.com/docs/api/personal-api-keys
- https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-data-export-api

No website deployment or GitHub push is part of this local review.

## Verification and remaining setup

51 focused tests pass: server/MFA gates before data access, production snapshot
exclusion, bounded periods, full-period ratio/aggregate handling, test/emulator
filters, unknown timing samples, provider failure isolation, no credentials in
errors, website tracking exclusion, and view/date navigation. TypeScript, scoped
ESLint, script syntax and diff checks pass. Authenticated Chrome shows the real
review snapshots and app readiness; a separate signed-out context sees no
analytics data, noindex/nofollow, and no tracking requests.320px and390px mobile fit
without horizontal overflow; App/28-day view retains its selection. No production
build was run against the active dev server; no dashboard publication occurred.

The mobile thread confirmed project replay/exception settings enabled, IP discard
retained (GeoIP can still occur before discard), dedicated EAS write-only symbol
credentials, and a persistent per-device staff opt-out. Those credentials must
not be reused for dashboard reads. Native production build attribution is still
unverified; old store binary2.0.1 does not have the latest contract. This dashboard
does not change any native files, store declarations or provider settings.

Next setup before live automatic reporting: provision dedicated read connections,
validate real API responses and site/property timezone/access, and persist Clarity
ingestion for a strict quota/history. Local reviewed snapshots cover both7/28
days for GA/GSC/PostHog and the recent Clarity UI window; GA daily values and
user counts remain unavailable rather than inferred from other metrics.
