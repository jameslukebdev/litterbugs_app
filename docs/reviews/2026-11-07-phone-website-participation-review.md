# Phone website participation review — November 7, 2026

## Scope and release status

Investigated phone-browser reporting, funding, and cleanup journeys using current
Clarity playback samples/event timelines and PostHog project **695338 — Litterbugs
Website**. This is website usage, not native-app usage. Dates below are Eastern
time. No production deployment, analytics settings change, report submission,
cleanup claim, or payment was performed during this pass.

Grant's new screenshots established a separate reporting layout defect. Fixed
locally: entering report placement now retains the quick-filter host, Filters,
Reports/Map controls, and mobile header controls instead of removing them. The
existing reporting pin and location confirmation remain available.

## Follow-up: location before account prompt (local only)

Owner authorized the location-first reporting change after the initial review.
Homepage/header Report entries now open `/report` directly for visitors. A guest
chooses a map location, then sees the existing account prompt after **Use this
location**. The confirmed pin is separate from the viewport and survives reload,
email verification, Google/Facebook returns, and the existing Instagram browser
handoff. Returning with an account opens reporting at that pin. Cancel clears the
selected pin. No anonymous account draft or report is written before signup;
publication still requires an account and the existing location checks.

Verified the signed-out localhost flow at phone size 393 × 851: picker before
signup, signup only after confirmation, selected pin retained after reload, and
dialog dismissal returns to the map. No browser errors observed. No real account,
report, cleanup claim, payment, or location permission was created/granted. Auth
return continuity was covered with tests rather than submitting real signups.
Screenshots: `/tmp/litterbugs-guest-location-first-phone.jpg` and
`/tmp/litterbugs-guest-pin-signup-phone.jpg`. Temporary viewport reset. Shared
local server not restarted. No push, deployment, or analytics setting changes.

Full web tests: **770 passed, 2 failed (772 total)**. Both failures are the
previously documented `lib/website-outcomes.test.ts` event-expectation failures;
they concern added participation events, not this report entry change. Reporting,
auth-return, route, and navigation tests passed. TypeScript, scoped lint, and
`git diff --check` passed.

### Three additional phone recordings

Continued the same Last 3 days list (57 recordings across devices); this does
not mean three newly arrived sessions. Inspected playback samples plus full
available event timelines, not every recorded second.

| Visit (ET) | Visitor | Duration | Evidence and interpretation |
| --- | --- | --- | --- |
| Nov 5, 8:56 p.m. | `122p4dx` | 12:25 | Repeated home → Find a cleanup → list/map and status switches. Same cemetery report opened at 10:33 and again 10:44, returned to list at 10:35/10:46. Reporter name tapped at 11:22. No Fund/Clean/auth action observed. Playback sampled at 02:16, 03:38, 10:35 and 10:44. The old detail view showed View full photo overlapping bottom actions; this predates the Nov 6 redesign and is not evidence of a current regression. |
| Nov 6, 5:30 p.m. | `198gf58` | 16:40 | Instagram `/get-app`, App Store outbound tap at 00:06, page hidden at 00:28; next recorded page visit at 16:39, hidden at 16:40. Playback showed the store landing page and hidden-page state. Long elapsed duration does not establish 16 minutes of engagement, a failed checkout, or an install. |
| Nov 7, 3:32 p.m. | `1fh4rsk` | 14:47 | Homepage then page hidden at 00:01; no clicks or subsequent visible interaction in the available timeline. Playback sample showed the dimmed hidden-page state. Do not classify this as an engaged visitor abandoning a particular participation step. |

Clarity flagged a dead click at 04:01 in the first session, but navigation to
`/reports` followed at 04:03. The App Store click in the second session was also
flagged dead while simultaneously marked outbound. Automated dead-click labels
alone do not establish a broken control.

The strongest additional behavior signal is repeated movement between homepage,
cleanup list and map without starting a task. Better report/action discoverability
and nearby inventory remain candidates to watch after the redesign; these three
sessions do not prove a current payment, cleanup, or upload defect. No additional
UI changes were made solely from these historical clips.

## Findings and recommendations

1. **Reporting layout jump: confirmed and fixed locally.** Conditional removal
   of navigation shortened the toolbar and resized the map. Browser measurements
   before/after entering reporting were identical after the fix:

   | Layout | Header | Toolbar | Map top | Map height |
   | --- | --- | --- | --- | --- |
   | Desktop | unchanged | 107px | 196px | 552px |
   | Phone, 393 × 851 | 59px | 63px | 122px | 729px |

   Navigation/filter hosts remain mounted and the map is not re-created. Local
   tests: 36 map-publication tests, scoped lint, and TypeScript passed. Browser
   enter/cancel checks passed at both widths with no console errors. No real
   report was created. Screenshots inspected and retained locally:
   `/tmp/litterbugs-report-stable-nav-desktop.jpg` and
   `/tmp/litterbugs-report-stable-nav-phone.jpg`.

2. **The account prompt is a candidate reporting friction point, not a proven
   authentication failure.** The November 6, 10:31 a.m. phone journey reached an
   empty searched area, tapped Report Litter, then closed the account prompt.
   A matching PostHog journey has `auth_shown` at 10:32:56.960 and `auth_closed`
   at 10:32:58.850, with no `auth_submitted`. Do not describe this as a broken
   Google sign-in or failed report upload. A useful next experiment is allowing
   signed-out visitors to choose the report location before the account prompt,
   preserving that choice through authentication. Owner subsequently authorized
   this change; it is implemented locally as described above, not deployed.

3. **Local inventory remains relevant to the cleanup journey.** The November 6,
   9:40 a.m. visitor searched Frank, NC, returned to the homepage, tried Map and
   Find a cleanup, and returned again. The 10:31 a.m. visitor searched New York
   before leaving. These are historical recordings made before the latest
   Google-only search and nearest-report recovery releases. Do not report the
   old mixed search labels or missing recovery UI as new current regressions.
   Watch for actual use of Find closest reports after those releases before
   judging their effect. No cleanup claim failure was established here.

4. **Some short visits are store handoffs.** The November 7, 12:26 p.m. Android
   Instagram session tapped Get it on Google Play at 00:02 and hid the page;
   Clarity marks an outbound click. PostHog captured the corresponding store
   click. Seven store-button events appear in the inspected rolling three-day
   window; six were on `/get-app`. These are outbound clicks, not confirmed
   installations, and should not be classified automatically as failed website
   participation. If the Instagram link's primary goal is website participation,
   consider linking to the map/homepage and keeping app downloads secondary.
   Do not change the bio/link destination without the owner's instruction.

5. **The evidence does not yet locate payment/cleanup form drop-off.** The
   inspected window contains 21 `participation_step` events in four sessions.
   Nine are the explicitly labeled November 6, 10:06 a.m. QA events. Of the
   remaining 12, three belong to one phone session; the others are unclassified
   desktop traffic and must not automatically be called genuine visitors.
   Only action_tapped/auth_shown/auth_closed occur in this window. There is no
   observed payment form, payment submission, safety review, claim, or evidence
   submission sequence to diagnose. Absence of outcome events does not establish
   zero completed actions in the backend. Validate full stage coverage in staging
   and consider bounded reason codes for location/photo/auth/payment/claim
   failures, without recording entered text or personal/payment information.

## Recording evidence inspected in this run

Clarity's current Last 3 days list contained **57 recordings**, across all device
types. Five phone sessions were inspected using playback samples and their event
timelines; this is not a claim of frame-by-frame viewing of every second.

| Visit (ET) | Clarity visitor | Duration | Observed sequence |
| --- | --- | --- | --- |
| Nov 6, 10:31 a.m. | `1tfut0e` | 1:22 | Cleaner → Find a cleanup → Reports/Map → New York search → Report Litter → account prompt closed; timeline reviewed, playback sampled around 00:20–00:31 and final state |
| Nov 6, 9:40 a.m. | `e118d5` | 3:53 | Find your area → Frank, NC → homepage → Map → homepage → Find a cleanup → homepage; playback inspected around 00:42, 01:42, 03:21 and full timeline |
| Nov 7, 11:08 a.m. | `eboh6w` | 1:56 | Homepage reload/scroll, reporter-name tap at 01:52, another tap, page hidden; no participation action established; playback sampled and timeline reviewed |
| Nov 6, 6:08 p.m. | `2pjfjx` | 0:22 | Homepage → Support at 00:05 → About Litterbugs at 00:07; informational browsing, not a failed task |
| Nov 7, 12:26 p.m. | `1fftqcv` | 0:05 | Instagram /get-app → Google Play outbound tap at 00:02 → page hidden; handoff, not proven installation or failed website flow |

Do not infer intent, user identity, errors, or installation completion from a
replay ending. Cross-provider correspondence here uses time/path/browser context,
not a shared person identifier. Desktop staff/test visits are not representative
phone conversion evidence.

## PostHog interpretation and sources

- [Clarity recording list](https://clarity.microsoft.com/projects/view/z60itnrbpn/impressions?date=Last%203%20days)
- [PostHog website replay list](https://us.posthog.com/project/695338/replay): the
  filtered seven-day query returned no recordings. Web source explicitly sets
  `disable_session_recording: true`; playback evidence therefore comes from
  Clarity. No replay setting was changed.
- [Existing phone map watcher](https://us.posthog.com/project/695338/insights/1kdPlWal):
  denominator is tracked phone sessions with a browser signal, not just homepage
  entries or visits intending to stay on the website. A read-only daily override
  for Nov 5–7 returned 12.9%, 18.18%, and 0% (Nov 7 partial). Denominators were not
  included in that response, and the sample is small; these are not evidence of
  a confirmed improvement or regression. Saved watcher was not edited.
- Event schema confirmed report/fund/clean and the three observed entry/auth
  stages. Raw autocapture records have no element text/chain, consistent with
  the site's property allowlist; use semantic events and Clarity for action
  attribution instead of guessing click meaning from raw counts.
- Governed metric catalog was empty. These diagnostic observations are not
  approved business conversion measures. The business-knowledge search tool was
  unavailable on this connection; no project/settings permissions were changed.
- [PostHog funnel definitions](https://posthog.com/docs/product-analytics/funnels)
  and [replay troubleshooting](https://posthog.com/docs/session-replay/troubleshooting)
  were checked through the connected PostHog documentation tool.

## Reproducible read-only queries

Tools used `projects-get`, `metric-list`, `read-data-schema`,
`query-session-recordings-list`, `insight-get`, `insight-query`, and `execute-sql`.
The replay query used date_from `-7d`, filter_test_accounts `true`, order
`activity_score`, limit `5`, returning zero rows. Insight-query override was
`{date_from: '2026-11-05', date_to: '2026-11-07', interval: 'day'}`.

```sql
-- Data freshness and volume, not a conversion rate.
SELECT event, count() AS events, min(timestamp) AS first_seen,
       max(timestamp) AS last_seen
FROM events
WHERE timestamp >= now() - INTERVAL 3 DAY
GROUP BY event
ORDER BY events DESC
LIMIT 15;

-- Entry/auth event audit; identify labeled QA before interpretation.
SELECT timestamp, properties.action, properties.stage, properties.page_type,
       properties.$device_type, properties.$browser, properties.$referrer,
       $session_id
FROM events
WHERE event = 'participation_step'
  AND timestamp >= now() - INTERVAL 3 DAY
ORDER BY timestamp
LIMIT 50;

-- Phone journey shortlist. No identity joins across analytics providers.
SELECT $session_id, min(timestamp) AS start, max(timestamp) AS finish,
       countIf(event = '$pageview') AS views,
       countIf(event = '$autocapture') AS interactions,
       groupUniqArray(properties.$pathname) AS paths,
       any(properties.$device_type) AS device,
       any(properties.$browser) AS browser
FROM events
WHERE timestamp >= now() - INTERVAL 3 DAY
  AND properties.$device_type = 'Mobile'
GROUP BY $session_id
ORDER BY start DESC
LIMIT 50;

-- Store clicks are not installs or payment/report conversions.
SELECT timestamp, properties.$pathname, properties.$device_type,
       properties.$os, properties.$browser
FROM events
WHERE timestamp >= now() - INTERVAL 3 DAY
  AND event = 'app_store_badge_clicked'
ORDER BY timestamp DESC
LIMIT 10;
```
