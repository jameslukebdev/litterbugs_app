# Phone website participation review — November 7, 2026

## Post-release availability check — November 7, about 10:07 p.m. ET

Read-only Vercel inspection confirmed deployment
`dpl_HgNgjXJMLnpf7Ur15xApJegWnbLd` is **READY**, target production, created
**9:54:03 p.m. ET** (`2026-11-08T02:54:03.248Z`). Creation is not the exact domain
promotion time. Used creation as a conservative earlier cutoff: if no phone
records exist since then, there are none in the narrower live-release interval.
Owner/Claude's handoff establishes that this is the released `f08518c` build.

- Clarity's refreshed Last 3 days list still has 59 recordings across devices.
  Newest phone recording remains Nov 7 **9:05 p.m.**, duration 4:02, visitor
  `11eh64m`; next is 8:56 p.m. `1ymvo8y`. Both were already inspected and predate
  the release. **No post-deployment phone recording is available yet.** This is
  available-recording evidence, not proof that no phone visited.
- PostHog record inspection from 9:45–10:05:13 p.m. found one phone pageview at
  **9:49:12 p.m.**, before deployment creation. Final query from **9:54:03 p.m.
  through query time (~10:07 p.m.) returned no Mobile event rows**, including
  sessions that might have started before release. No phone participation steps
  are captured in that interval to compare with earlier behavior.
- The wider 9:45–10:05:13 p.m. audit did find 33 `participation_step` records,
  all in one **Desktop / Chrome** session, `01a1b912-e088-7886-b46e-47718727eceb`,
  spanning 9:53:08–9:56:13 p.m. Its sequence changes from immediate report auth
  to location_picker → location_confirmed → auth, plus Fund/Clean auth prompts.
  Some events predate deployment creation. Identity/test status is unverified;
  do not count this as phone-user improvement or call all 33 post-release.

It is too early to assess whether reporting, funding or cleaning completion has
improved. Missing captured phone events do not establish zero backend outcomes.
[PostHog's replay/funnel guidance](https://posthog.com/tutorials/explore-insights-session-recordings)
supports comparing actual step events with relevant recordings; there is no new
phone sequence for that comparison yet. No new defect identified or application
fix made. No push/deployment, production-site test, database write, analytics
configuration change, shared-server restart, or test rerun. Claude's local social
card/share image, package and lockfile changes remain untouched.

Read-only record query (not a conversion rate):

```sql
SELECT timestamp, event, properties.$device_type, properties.$browser,
       properties.$pathname, properties.action, properties.stage, $session_id
FROM events
WHERE timestamp >= toDateTime('2026-11-08 02:54:03', 'UTC')
  AND timestamp < now()
  AND properties.$device_type = 'Mobile'
ORDER BY timestamp
LIMIT 100;
```

## Release baseline update

Owner confirmed Claude pushed and deployed the previously local changes. The
handoff records live source **`f08518c`**, deployment
**`dpl_HgNgjXJMLnpf7Ur15xApJegWnbLd`**, including the location-first reporting,
guest Fund/Clean continuation, stable reporting navigation and Claude's workflow
redesign. A read-only `git ls-remote` confirmed GitHub's branch head matches local
**`02f8f66`**, the release handoff commit. This pass did not independently run a
live authenticated journey or deployment inspection. Earlier local-only status
notes below describe their original review times and are superseded by this
release update. No new changes in this pass were pushed or deployed.

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

## Continued pass: explicit Fund/Clean links (local fix)

Five more phone sessions were inspected from the same 57-recording list using
event timelines and playback samples. All five were recorded Nov 5, before the
recent redesign. Historical friction was reproduced against localhost before
changing behavior; visitor identity/non-staff status is not established.

| Visit (ET) | Visitor | Duration | Observed sequence |
| --- | --- | --- | --- |
| Nov 5, 1:23 p.m. | `17v1y31` | 2:55 | Home → Support/About at 00:17/00:21 → cleanup policy at 00:47 → Support at 02:18 → Donate → Fees, rewards & refunds at 02:35 → `/fund-a-cleanup` at 02:36. Sampled policy at 01:07 and funding information at 02:36. No checkout or authentication attempt observed; this is policy/information browsing, not a proven failed donation. |
| Nov 5, 12:59 p.m. | `1ykugca` | 0:27 | Instagram shared cemetery report → Clean up this report at 00:09 → map with `intent=clean` at 00:10. Sampled map report at 00:19; it still offered Sign in to clean rather than continuing the explicit action. One unlabeled click at 00:27; no safety review or claim established. |
| Nov 5, 11:08 a.m. | `198lbhr` | 0:14 | Instagram shared report → Fund this cleanup at 00:06 → map with `intent=fund` at 00:07, then browse URL normalization. At 00:11 the detail/footer still offered Sign in to fund. No payment form/submission observed. |
| Nov 5, 12:13 p.m. | `xy74z7` | 16:33 | Instagram `/get-app` → Continue on the website at 00:03 → map at 00:04 → two reports at 00:18/04:21 → Earn/Find litter to clean at 04:44/04:49 → Rewarded at 05:05 → old No matching cleanup opportunities state at 05:06. Page hidden 00:32–03:59 and again after 05:15; do not treat elapsed duration as active engagement. Empty-results snapshot sampled at 05:06. This predates closest-report recovery, so does not establish that recovery is broken now. |
| Nov 5, 9:24 p.m. | `1c3a7j4` | 0:20 | Instagram shared cemetery report, no clicks; sampled 00:09 showed the scrolled report information and cleanup link. No evidence of a particular blocked action. |

**Confirmed current issue and local fix:** a signed-out visitor opening an
explicit `intent=clean` link still landed on the report and had to tap Clean
again. Reproduced at localhost 393 × 851 before editing; second tap opened auth.
Fund used the same guest-entry omission. Both action components now honor the
explicit link with a single account prompt once the action is available. Funding
still waits for enabled feature flags/eligibility. Ordinary report browsing does
not open auth. Dismissal stays dismissed on re-render; manual taps do not duplicate
auth prompts or action tracking when intent is added to the URL. Existing
post-sign-in amount/safety review remains; no payment is created and no agreement
accepted or cleanup claimed automatically. No location-first reporting change.

Verified local phone Clean and Fund links → matching sign-in headings without
another action tap; closing each returns to the report. No framework overlay or
console warning/error observed. No credentials, agreement, report, payment, claim,
or GPS permission submitted. Screenshots:
`/tmp/litterbugs-direct-clean-signin-phone.jpg` and
`/tmp/litterbugs-direct-fund-signin-phone.jpg`. Viewport reset; server untouched.
Six scoped test files: **131 pass**, including existing signed-in continuation and
publication safeguards plus new entry deduplication/availability coverage.
TypeScript, scoped lint and diff checks passed. Claude's concurrent cleanup UI
changes were preserved; only the guest-entry additions belong to this fix.

The existing PostHog participation-event audit was re-run over the rolling three
days: still the same 21 rows/four sessions, including nine explicitly labeled QA
events and the one phone report/auth close sequence. No newer payment/safety/
claim/evidence stage sequence appeared in this inspected sample. No new funnel
rate was calculated; [event capture](https://posthog.com/docs/data/events) and
[funnel steps](https://posthog.com/docs/product-analytics/funnels) describe tracked
interactions, not independent proof of backend completion or failure. No PostHog
settings, saved insights, or recording configuration were changed.

## Broader review: six additional phone sessions

Expanded the Clarity view to [Last 7 days](https://clarity.microsoft.com/projects/view/z60itnrbpn/impressions?date=Last%207%20days),
which showed **91 recordings across devices**, versus 57 in the three-day view.
This is a wider window, not 34 newly arrived recordings. Inspected six previously
unreviewed phone sessions below using full available timelines and selected
playback frames. No inference of non-staff identity or person-level continuity
between different visitor IDs is made.

| Visit (ET) | Visitor | Duration | Observed behavior and limits |
| --- | --- | --- | --- |
| Nov 1, 12:42 p.m. | `wx1wvt` | 4:46 | Chrome Mobile: Continue on website at 00:01, extensive map pans/zooms, View full photo at 01:07 and 02:38, repeated Next photo taps 02:41–02:47. Samples at 00:16, 02:42 and 02:44 showed different photos; controls responded. No Report/Fund/Clean/auth action observed. The 37 historical page entries include viewport URL updates and must not be called 37 distinct content pages. Hidden 01:32–01:49 and 03:03–04:14. |
| Nov 4, 6:35 a.m. | `12n0oi1` | 2:34 | Mobile Safari: completed Greenwood report → View on map 00:26 → community 00:43 → All Boone results 01:50 → completed community listing 01:52 → home 02:24. At 01:49 playback showed the link directly under Completed cleanups, so its completed-only destination was contextual, not evidence of the Available filter failing. No claim/funding/report attempt observed. |
| Nov 4, 9:05 p.m. | `m7l1l6` | 0:10 | Instagram: Log in / Sign up at 00:06, Continue with Google at 00:08; final snapshot has Signing in with Google / Opening Google sign in. Only about two seconds after the tap are recorded. This predates the external-browser changes and does not show a provider rejection, successful login, or what happened in the other browser. |
| Nov 4, 9:19 p.m. | `oxilgr` | 0:20 | Instagram home: Choose a spot at 00:19, recording ends 00:20 with no next-page evidence. Sample at 00:10 showed the old homepage cards. Historical home markup linked that button through funding information; current local homepage links directly to the available-report map. Do not classify a recording ending one second after a link tap as a confirmed navigation failure. |
| Nov 4, 9:20 p.m. | `qbnxkg` | 0:18 | Instagram `/fund-a-cleanup`, no clicks; page hidden at 00:14. Sample at 00:08 showed contribution/fee information. No payment form or payment attempt observed. Despite adjacent timing, do not assert this is the same person as the preceding row. |
| Nov 5, 1:46 p.m. | `1e37km6` | 0:12 | Instagram home: App Store outbound click at 00:09, also labeled Dead click by Clarity. Sample at 00:02 showed visible store links. Store handoff is observed; an install or failed website task is not established. |

No new current reporting, payment or cleanup-submission defect was confirmed in
this set. The evidence supports retaining the already implemented direct map
entries and explicit Fund/Clean continuation. Repeated photo taps alone are not
a reason to disable cycling or redesign the gallery: the inspected images changed.
Completed-cleanup visitors should not automatically be classified as attempting
to claim a new cleanup. Google handoff endings require post-return evidence before
diagnosing an auth failure. No extra UI changes were made from these clips.

Preserved all concurrent Claude changes, including funding/cleanup panels, payout,
report wizard and shared styles. This pass changes review/handoff documentation
only, with no application edit, push, deployment, database write, production test,
analytics setting change, or shared-server restart. Ran focused regression checks
against the shared working tree because Claude's funding/cleanup components had
changed since the preceding pass; result recorded in the handoff entry.

## Remaining-session review: five additional phone recordings

Expanded the list to [Last 30 days](https://clarity.microsoft.com/projects/view/z60itnrbpn/impressions?date=Last%2030%20days):
**97 recording cards, 62 marked Mobile, 27 of those with at least one click**.
These are recording-list counts, not unique people or conversion rates. The
wider window added only six recordings beyond the seven-day view; just one was
Mobile (a one-second Oct 31 `/get-app` visit). Most useful older phone action
sessions had already been inspected in the preceding passes. Five additional
sessions were inspected with timelines and playback samples:

| Visit (ET) | Visitor | Duration | Observed sequence and limits |
| --- | --- | --- | --- |
| Nov 5, 9:14 p.m. | `13712ra` | 29:23 | Available cleanup list loaded. Hidden 00:16–04:12 and 04:21–28:38; homepage visits 28:43/28:50; no recorded clicks. Sample at 00:35 showed the loaded list in hidden-page state. This was not 29 minutes waiting for results. No participation attempt established. |
| Nov 6, 8:20 p.m. | `1bec4zq` | 0:21 | Instagram `/get-app`: App Store outbound tap 00:02, hidden 00:16. Sample 00:11 showed the landing page with store and website buttons. Dead-click flag also present, but no independent evidence of a broken store link or completed install. |
| Nov 5, 5:46 p.m. | `1q8yqup` | 0:35 | Chrome Mobile `/get-app`: Google Play outbound tap 00:32, hidden 00:34. Sample 00:25 showed the entry page; no report/fund/clean action. Do not classify the outbound transition as failed website participation. |
| Nov 6, 2:10 p.m. | `188k9nc` | 0:38 | Homepage, hidden at 00:03, no clicks. Sample 00:28 showed the dimmed homepage. No evidence of a stalled report, payment or cleanup flow. |
| Nov 1, 12:17 p.m. | `2vv88u` | 0:06 | Mobile Safari: Continue on the website 00:01 → `/map?view=map` 00:02 → browse normalization 00:02 → viewport URL 00:03. Final 00:06 snapshot showed the map and report markers loaded. Four page entries represent one map-entry sequence, not four distinct tasks. No further action or error observed. |

No new current blocker was confirmed. These sessions add evidence about hidden
time, outbound taps and entry transitions; they do not test deep payment or
cleanup submission reliability. A temporary spinner while seeking the short map
replay belonged to Clarity; the final recorded map snapshot loaded. No production
site testing, settings changes, application edits, tests rerun, push or deployment
in this pass. All concurrent Claude code remains untouched. Avoid further UI
changes based solely on these inactive or outbound-only clips; prioritize future
recordings with actual participation steps.

## Clicked-phone backlog completion and two newer sessions

The refreshed 30-day list now has **99 recordings, 64 Mobile, 28 Mobile with
recorded clicks**. Two phone recordings became available since the preceding
97-recording snapshot. Both were captured before the release above; neither
provides post-release participation evidence. Compared recording cards with the
existing reviewed-session ledger, then inspected the two newer sessions and all
eight remaining clicked phone sessions with event timelines and playback samples.

| Visit (ET) | Visitor | Duration | Observed outcome |
| --- | --- | --- | --- |
| Nov 7, 9:05 p.m. | `11eh64m` | 4:02 | Home → Map tap 00:33 → Boone map URL 00:34 → home 04:01. Sample 01:47 showed loaded map, report pins and Report Litter. Hidden 01:48–02:48 and 03:06–03:34. No Report/Fund/Clean/auth attempt observed. |
| Nov 7, 8:56 p.m. | `1ymvo8y` | 1:46 | Homepage; hidden at 00:01 and 00:15, no recorded taps. Sample around 00:59 showed hidden homepage. No task attempt established. |
| Nov 5, 9:01 a.m. | `1ui6k88` | 0:25 | App Store outbound tap 00:01, hidden 00:01, visible 00:22, hidden 00:24. Sample 00:15 showed hidden `/get-app` page. |
| Nov 5, 9:29 a.m. | `t3je6d` | 4:19 | App Store tap 00:01, hidden 00:08, no later interaction in the timeline. Sample 01:11 showed hidden entry page. |
| Nov 5, 8:45 a.m. | `19jrhww` | 0:16 | Google Play outbound tap 00:03, hidden 00:04, visible 00:15, hidden 00:16. Entry page sampled 00:06. |
| Nov 5, 12:49 p.m. | `rdoj71` | 0:08 | Google Play outbound tap 00:01, hidden 00:02, visible 00:07, hidden 00:08. Entry page sampled at start. |
| Nov 5, 9:25 p.m. | `1jfbzi3` | 0:04 | App Store outbound tap 00:02, also marked Dead click. Entry page sampled at start; no participation action. |
| Nov 5, 9:49 a.m. | `jnbpll` | 0:03 | App Store outbound tap 00:02, also marked Dead click. Entry page sampled at start. |
| Nov 5, 12:22 p.m. | `4syaq9` | 0:02 | Google Play outbound tap and page hidden at 00:01. Entry page sampled at start. |
| Nov 5, 5:46 p.m. | `oa2dlx` | 0:02 | Chrome Mobile: Google Play outbound tap and page hidden at 00:01. Entry page sampled at start. Separate from this ID's one-second zero-click visit. |

All **28 currently listed clicked phone recording cards** are now represented in
the review ledger. This means timeline triage and sampled playback, not every
second watched or all 64 phone recordings fully reviewed. Remaining unreviewed
phone cards have no recorded clicks; that does not prove no reading, scrolling,
map gestures or missed instrumentation. Different visitor IDs are not joined as
the same person, and staff identity is unverified. Store taps do not prove installs
or broken website tasks. No additional Report/Fund/Clean attempt was found in
this remaining clicked set, and no new reproducible blocker was established.

No application edits or test reruns in this pass. Preserved Claude's uncommitted
social-card/share-image changes and dev preview; shared server untouched. No
production-site tests, database writes, analytics-setting changes, Git push or
deployment. Future review should prioritize actual post-release participation
events/recordings rather than reclassifying these older outbound-only visits.

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
