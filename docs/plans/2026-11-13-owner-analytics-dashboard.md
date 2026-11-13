# Litterbugs website and app analytics — local review

Grant requested a custom owner dashboard combining Google Analytics, Google
Search Console, PostHog and Clarity, rather than embedding the PostHog dashboard.
He subsequently requested the unreleased app analytics from the parallel
“Finish mobile analytics verification” chat. Overview / Website / App views keep
both surfaces distinct while using the same7/28 complete-day period control.

## Automatic local connections — November13

Grant authorized live connections for local review only. The existing dashboard
now reads GA561329300, GSC sc-domain:litterbugs.app, PostHog695338 (website and
production app) and Clarity z60itnrbpn automatically. It retains the business
aggregate adapter. All five provider adapters and business reads passed real
7/28-day checks; private evidence lives in ignored
`apps/web/.analytics-local/live-connection-verification.json`.

- PostHog: a new personal key named **Litterbugs owner dashboard (read only)**,
  only `query:read`, restricted to project695338. The mobile symbols key is unchanged.
- Clarity: new export token **Litterbugs-owner-dashboard** for this project only.
  Verified the real API response shape. `sessionsCount` is the examined population;
  use `sessionsWithMetricPercentage` for signal rates. Do not report all examined
  sessions as affected sessions or infer exact counts from rounded percentages.
- Google: the existing SEO connection has the required read-only OAuth scopes.
  The local bridge uses its installed public SDK to obtain a short-lived token
  inside a bounded child process, then reads fixed GA/GSC report endpoints. OAuth
  refresh credentials remain in the tool's original store and no access token
  leaves that process. Three reports per provider share authorization; no copied
  OAuth refresh token or cached CLI report is used as a newly fetched report.
  Google's occasional cold-request timeouts receive one bounded retry; HTTP401,
  403 and429 are not automatically retried. Successful aggregates cache15minutes.
  Failed reads remain unknown and are not cached as empty results for15minutes.
- A temporary dedicated Google service account was explored but organization
  policy blocks keys and excludes the existing OAuth identity from impersonation.
  Policies were not weakened. Its temporary GA/GSC grants and IAM binding were
  removed and the unused account deleted. No service-account key was created.
  Reporting/IAM credential APIs were enabled in litterbugs-auth; no broad IAM role
  was granted. The working local connection uses the already authorized OAuth SDK.
- Local-only settings live in ignored `.env.development.local`, mode0600. Tokens
  never enter NEXT_PUBLIC variables, client components, screenshots, Git or logs.
  The SDK module path is local configuration, not a committed machine path.

The page checks for updates every5minutes while visible, and when returning to
an overdue tab. Date/view selections remain unchanged and leaving the page removes
its timer. Provider reads remain behind server membership/MFA checks. GA/GSC/
PostHog refresh at most every15minutes; business totals every5minutes. Complete-day
windows and GSC's existing final-data lag are unchanged. No separate scheduled
agent, cron job or cloud publication was created for this local-only request.

Clarity has a persistent local aggregate ledger with six-hour cooldown, atomic
request reservation/lock, failure cooldown and a cap of8 requests per UTC day,
leaving2 for diagnostics. Date/view switches and dev-server restarts share it.
Only normalized aggregates are stored; no raw visit records/URLs or token.
A quota lock/cache write failure returns unavailable data rather than bypassing
its budget. The first verified API response seeded this ledger without a second
call. For future publication, replace the local SDK/database adapters and local
Clarity ledger with reviewed server credentials/storage; this does not establish
production-host automatic reporting. The dashboard remains undeployed.

App reads are connected but the latest app remains unreleased. Its production
query excludes QA/emulators/test flags; app and combined visits stay unknown.
Keep the release flag unset until actual public activation. Native symbols alone
remain insufficient proof of end-to-end current-production crash capture.

Verification:77 focused tests pass, including hidden-tab/unmount timer behavior,
private route/MFA gates, unknown-versus-zero handling, Clarity denominator/rate
mapping, persistent quota/failure cooldown and recovery after failed provider reads.
TypeScript, scoped ESLint, script syntax and diff checks pass. Real credentialed
7/28 reads returned live for all five adapters and business totals. Authenticated
Chrome verified both date ranges and app awaiting release. A signed-out HTTP read
contained only sign-in and no private metrics/key. Local credential/cache files
are0600 and ignored. No production build, dashboard deployment or GitHub push.

Additional review-account/date verification: business reads exclude users whose
server-owned `raw_app_meta_data.review_account` is boolean true, including their
reports, cleanup actions, contributions/refunds and fixtures on their reports.
User-editable metadata cannot opt a real account out of business measurements.
The persistent Apple review account was verified flagged with zero business rows;
no credentials, identity details or account IDs were added to analytics events.

The read-only CTE regression exposed PostgreSQL's implicit DATE AT TIME ZONE
overload. Date bounds now explicitly cast to timestamp first, producing NY
midnight timestamptz values for current and comparison periods. This corrected
7-day principal funding from$47 to$37; other new-report/cleanup counts remain6/4.
The former cutoff included$10 in payments outside the selected complete-day window.
Regression command: `node scripts/check-owner-analytics-business.mjs --linked`
(or `--local` on a local DB). It substitutes CTE-only fake rows and performs no
writes. Both7/28 windows passed reviewer author/cleaner/funder/parent exclusion,
user-metadata spoof resistance, real refunds, late-night activity, boundary funding
and graph reconciliation. Live aggregate query also passes; no DB migration.

This supersedes older unconfigured-connection and snapshot-only notes below.

## Implemented owner metrics and simpler page — November13

Grant approved the six proposed metrics below for local implementation. The
overview now leads with total visits (website/app split), completed cleanups,
cleanup funding, new litter reports, active contributors and reports awaiting
cleanup now. It includes the reports/cleanups daily chart, backlog attention
items and reported weight/bags/hours with field coverage. Website and App views
remain. Provider names, source/freshness sections, citations, definition catalog,
release diagnostics and technical commentary are removed from the rendered page.
Compact dates remain where search/recordings cover a different reporting window.

Design reference follow-up: Refero Visitors screens
`c522c494-3c66-4f83-9be7-0b8b608d2f4b` and
`f69b345c-3bb7-4880-9dc9-e45166d54624`: short metric labels, quiet date controls,
white space and a primary chart. Retained Litterbugs typography/purple and mint;
rejected reference forest-green styling. This supersedes the older presentation
notes below; source definitions remain internal implementation documentation.

Business records now load through `lib/admin-analytics/business.ts` only in
development, after full admin/MFA authorization. The owner's already linked
Supabase CLI executes fixed `scripts/owner-analytics-business.sql`, with project
verification, a20-second timeout and5-minute aggregate cache. No credentials
copied, raw user rows returned, schema changes or database writes. It is disabled
in production: a separately reviewed private aggregate connection is still
required before publication. Other provider connections remain as described below.

The query excludes samples, drafts and removed reports. Publication's existing
trigger resets `created_at`; completed attempts use `completed_at` and each final
submission once. Successful USD contributions count principal, exclude fees and
pending/failed attempts, and retain later-refunded payments; actual principal
refunds appear separately by refund date. Registered contributor accounts are
deduplicated privately across reports, successful funding and completed cleanups;
anonymous users are excluded. Current available backlog excludes cancelled/expired
reports. Missing impact fields remain unknown. NY calendar-day comparisons handle
the November DST change; daily totals reconcile to their headline counts.

App visits use full-period distinct PostHog sessions across `$screen` OR
`Application Opened`, with the existing production/test/emulator filters. A real
read-only API query accepted the grouped session definition. No launch/session
mixing or GA/PostHog double-counting. Unreleased app data is unknown, so combined
visits remain a dash while the website count is visible. The future server-only
`ADMIN_ANALYTICS_APP_RELEASED=true` flag permits a verified released app's genuinely
quiet period to remain zero. It is not set now; the latest app is still unreleased.

Verification:66 focused tests, TypeScript and scoped ESLint pass. Authorized
desktop/320px/390px layouts fit, date changes preserve the selected tab, separate
signed-out context exposes only admin sign-in/noindex, and test browsers stay
excluded with no external analytics requests. No dashboard runtime errors. Real
7/28-day aggregate query runs and DST boundaries reconciled. No production build
against the active dev server, deployment or GitHub push.

## Latest app handoff — November13, after device verification

Final native production candidates are frozen at `c34f569`, version2.1.0 iOS27 /
Android24, both finished but unsubmitted and unreleased. Matching Hermes and native
symbol sets are uploaded and bound to those versions. Physical QA verified events,
replay privacy and saved opt-out; this supersedes older unbound-symbol/device-QA
notes below. Symbols prove availability, not a current-production crash occurrence.
QA namespaces/environment test remain excluded, including
`com.gegibson.litterbugs.releaseqa`. App/combined visits remain unknown until actual
public activation. Final evidence: `docs/reviews/2026-11-13-mobile-release-readiness.md`.

Current local key-presence check: dedicated Google service-account, PostHog read
key and Clarity export token remain unconfigured. The existing local snapshots
and development-only business aggregate adapter support review; the owner page
is not yet automatically live-connected or deployed. No credentials inspected
or changed by this status review; no provider settings or release flag changed.

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

Final mobile handoff received: local source `e690eb5`,617 passing tests, lint and
223-module source check. The event/timing schemas remain unchanged; device-wide
staff opt-out is complete. Verified uploaded local iOS/Android symbol files have
no production-release binding, so native-crash production coverage stays
unclassified. The mobile app has not been released or pushed. Evidence:
`docs/reviews/2026-11-13-mobile-analytics-verification.md`.
The separate privacy-only source `4d4e2e8` is now live on litterbugs.app/privacy
(effective November13,2026), deployment `dpl_2A2dd4XGKrLZ2kEyK1wSSn3eWd2d`.
That deployment excluded this dashboard and the mobile changes. No further event
fields are needed from the mobile thread for the current dashboard integration.

## Original owner metric proposal — November13 research

Primary recommendation: completed cleanups per week, supported by active
contributor accounts and confirmed cleanup funding. Traffic and incoming reports
explain growth; they do not alone establish that litter was removed. No numeric
targets are proposed without measured baselines and agreed operating cadence.

Suggested overview cards:

| Metric | Proposed meaning and controlling source |
| --- | --- |
| Total visits | PostHog website sessions plus production app sessions, with a web/app breakdown. Same complete period/timezone and verified session rules; never add GA website sessions to PostHog website sessions. Not unique people; app launches/pageviews are different units. |
| New litter reports | Distinct valid reports first published in the period, from backend business records; exclude drafts, rejected/test reports and retry duplicates. Confirm historical publication/moderation timestamps before implementing. |
| Completed cleanups | Distinct cleanup attempts reaching the existing completed workflow state in the period, from backend records. Claims and photo submissions stay separate. Break down reporter/automatic/self approval and funded/volunteer rather than implying every completion received independent human verification. |
| Cleanup funding received | Confirmed successful contribution principal received in the period, excluding service fees and unsuccessful/pending attempts. Payment ledger supplies totals. Show actual principal refunds separately by refund date; any net-flow figure subtracts those refunds and is not a current fund balance or platform revenue. Currency stays explicit. |
| Active contributors | Distinct registered accounts with at least one qualifying published report, successful contribution or completed cleanup in the period. Deduplicate accounts across devices/surfaces and overlapping roles in the private backend; never send account IDs into analytics to achieve this. Label account scope and handle any guest contributions separately. |
| Reports awaiting cleanup | Current eligible open-report backlog, split funded/unfunded and aged. Snapshot metric as of fetch time, not a sum of reports created during the selected period. |

Supporting decisions: funded reports waiting for a cleaner and oldest backlog age;
report-to-completion median together with unfinished report age (avoid completed-
only survivorship conclusions); month-to-month repeat contribution by role;
Google search/marketing acquisition; separate report/fund/cleanup funnels;
map/report readiness and failure-session rates with sample coverage. Clarity
signals point to recordings, rather than functioning as confirmed bug totals.

Impact detail: sum reported pounds, bags/items and cleanup hours only from the
final accepted submission of each counted completed attempt. Label as reported,
show how many completed attempts supplied each field, and keep missing values
unknown. Bags/items are mixed units; do not turn them into bags or weight.

A future report-to-cleanup rate should use a fixed follow-up window (for example
30 days) and only mature report cohorts. Do not divide this week's completions
by this week's newly created reports. Repeat participation should match the
natural weekly/monthly cadence, rather than assuming daily use is the goal.

Presentation proposal: complete7-day totals versus prior7 days,28-day trend,
optional clearly labeled all-time impact. Break down business results by town/
community and funded/volunteer cleanup; visitors stay separately attributable
to web/app/device/acquisition. Small samples need counts alongside percentages.

Feasibility: existing frontend telemetry is sufficient for some usage/diagnostic
metrics, but the current dashboard does not query authoritative application or
payment-ledger totals. Those need a reviewed private aggregate connection and
date/status/test-data definitions before implementation. Current privacy forbids
cross-platform identification in analytics; backend aggregate account counts
must not turn into tracking identities. App production coverage is still pending.

Research grounding (recommendations adapted to Litterbugs, not industry targets):

- Amplitude's value-based outcome framework: https://www.amplitude.com/books/north-star/about-north-star-framework
- Marketplace fulfillment and liquidity: https://www.sharetribe.com/academy/measure-your-success-key-marketplace-metrics/
- Session definitions across PostHog web/mobile: https://posthog.com/docs/data/sessions
- Transaction volume versus marketplace earnings: https://stripe.com/resources/more/14-key-marketplace-metrics
- Clarity diagnostic signal meanings: https://learn.microsoft.com/en-us/clarity/insights/semantic-metrics

Checked current mobile cleanup summaries/approval labels and impact presentation,
plus the released/unreleased event contracts. No live business totals were
queried, no source was connected, and no dashboard code or metric object changed
as part of this research.

## Hosted website release — November 13

The owner approved deploying the dashboard. The release is isolated on
`codex/website-analytics-20261113`, based on live website source `5c32ab8` plus
only dashboard commits. Unreleased native changes and root history are excluded.

Production Google reads refresh the existing read-only OAuth authorization,
kept in Vercel sensitive server environment variables. PostHog uses the dedicated
project query key; Clarity uses its project export token. No credential reaches
client components, logs or Git. The local Google CLI and local business CLI never
run in production. Google scopes are checked against the read-only allowlist.

Business totals use `owner_analytics_business`, an aggregate-only RPC guarded by
active admin membership, permanent-user status and MFA. The web server uses the
requesting admin's Supabase session; it has no new service-role or SQL key.
Clarity's private cache uses the same gates and an atomic request reservation,
six-hour cooldown, eight-attempt UTC daily ceiling and one-use completion lease.
Only normalized aggregates are stored, including failed observations. This quota
survives server instances, period/view switches and deployments. Dashboard refresh
runs every five minutes while visible; Google/PostHog cache successful reads for
15 minutes, and business totals refresh with the page. Provider outages stay
unknown rather than appearing as zero. App production traffic remains excluded
until it actually exists; no app build or release is part of this deployment.

Migration: `20261113191709_owner_analytics_hosted_connections.sql`. Rollback-only
SQL checks validate the migration, admin/MFA gates, private cache permissions,
leases, cooldown and budget. The read-only business fixture checks NY boundaries,
review-account exclusions and reconciliation. Hosted verification and final
release evidence are recorded in the agent handoff log.
