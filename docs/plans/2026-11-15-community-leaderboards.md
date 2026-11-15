# Automatic community pages with leaderboards — build plan

Written November 15, 2026 for Grant. The approved look is the local mock-up at
`/dev-review-preview/community` (sample data only).

## Status — November 15, 2026 (local build, not deployed)

Grant chose to add the new tables to the **live database** (additive only; the
live website does not read them) and to build the website on localhost only.

- **Live database:** migrations `20261115160657_community_leaderboards` and
  `20261115161936_community_overpass_timeout` are applied. Two scheduled jobs
  run: `litterbugs-community-assignment` (every minute: place lookups, creating
  communities, assigning accepted reports) and `litterbugs-community-champions`
  (hourly: records last month's winners once a town's month has ended).
  `profiles.show_on_leaderboards` exists (default on).
- **Local website (uncommitted):** menu item "Leaderboards" (removed
  "Communities" from Earn; footer renamed); `/communities` is the Leaderboards
  home (global boards + towns list); every town page is served by
  `app/communities/[country]/[region]/[place]`; Boone's old static page is
  removed (its `/cleanups` listing page is unchanged); share image at
  `/communities/rank-card`; opt-out switch in account Settings; privacy policy
  sentence; sitemap and `llms.txt` read indexable communities from the database.
- **Differences from this plan:** rows open the member's profile page
  (`/members/[id]`) rather than a pop-up; the map beside the board exists only
  for Boone (the only town with a map snapshot); the county "largest town"
  lookup uses the public Overpass service, which is often at capacity — after 3
  failed tries a county keeps its own name.
- **Later the same day:** counties are now named from the place lookup each
  report already gets (`20261115162836`), because the Overpass service was
  repeatedly at capacity and left Avery and Wilkes waiting. Every published,
  real report is now assigned (`20261115163022`), while pages, counts and
  boards still use accepted reports only. `community_for_reports()` gives
  report pages their community.
- **Old Communities system removed (website only; it never had database
  objects):** the editorial directory, the Boone ZIP boundary, the Boone
  cleanup listing (now a 308 redirect in `next.config.ts`), community
  bookmarks, the old community search and controls, the community "journey"
  return paths in the report, map, sign-in and payment flows, and
  `docs/community-foundation.md`. Report towns now come from the community data
  (a county named after its town gives that town) and the town lookup; all 31
  sitemap report addresses were identical before and after. Related reports on
  a report page are now always "nearby" by distance.
- **Finding a town (later Nov 15):** the Leaderboards home opens with a town
  search (known towns as you type; any other place is looked up with
  OpenStreetMap when you press Search and matched to its community with the
  same rule as reports, so "Banner Elk" finds Avery County), a Near me button
  (compares your position with town centres in the browser; nothing is sent),
  and the signed-in person's own towns. Beside the board: Busiest towns and
  Browse all towns by country. New pages `/communities/[country]` and
  `/communities/[country]/[state]` list states and towns; town pages link back
  to their state. Database: `20261115170131_community_finder`
  (`community_for_place`, `my_communities`). Every known town is sent to the
  home page for instant matching; past roughly 1,000 towns, move that matching
  to the server.
- **Database cleanup (Nov 15):** compacted `net._http_response`, purged old
  scheduled-job history with a daily purge job (`20261115165249`), removed two
  unused rank-point functions (`20261115165250`) and deleted 158 photos whose
  reports or cleanups no longer exist. Database 372 MB → 25 MB; report photos
  500 MB → 182 MB.
- **Not done yet:** release (needs Grant's go-ahead), the privacy policy's new
  effective date, analytics events for board changes and sharing, and the
  mobile app's opt-out switch. Share images fail on this Mac with a local
  `sharp` error that also breaks the existing report share image; check both on
  a Vercel preview.

This plan replaces the editorial process in `docs/community-foundation.md`
("Adding a community"). Communities now create themselves from activity, with
the indexing safeguard below instead of manual review.

## Decisions already made

| Topic | Decision |
|---|---|
| Page | Replaces the current community page. Town name, three boards, Your standing with Share my rank, past champions, map on desktop, local help. No report cards, open spots or cleanup photos. |
| Boards | Cleaners, Reporters, Funders. Each person's own rank bug. Monthly by default, All time as the second option. |
| Own content | Anything Litterbugs owns that the page would link to (the cleanup guide) lives on the page. Only outside organisations are linked. |
| What a community is | Inside a city of 50,000+ people: that city. Everywhere else: the county or its local equivalent, named after its largest town if it has 10,000+ people, otherwise after the county. |
| Boone | Becomes Watauga County, still named "Boone, NC" at `/communities/us/nc/boone`. All 51 current Boone reports stay; 1 more joins. |
| When a page exists | Created and publicly visible from its first accepted report. |
| Funders | Everyone is included by default. One account setting hides a person from all boards. |

## Safeguards (approved November 15)

1. **All-time fallback.** If this month's board has fewer than 3 people, the
   page opens on All time. The month is still one tap away. When the month
   fills to 3, the default returns to monthly.
2. **First name and last initial.** Public pages show "Maya R.", never a full
   name. The shortening happens in the database function, so full names are
   never sent to the page. A person's own Your standing card says "You".
3. **Index only when there is substance.** Every page is visible and shareable
   from its first accepted report, but it tells search engines not to index it
   until it has **5 accepted reports or 1 confirmed cleanup**. Only indexed
   pages go in the sitemap and `llms.txt`. The site's own Communities list
   still shows every public page.

## Phase 0 — Before anything changes (½ day)

- Export what the current Boone page ranks for in Search Console (queries,
  clicks, position, last 3 months). Keep that list. The new page's title,
  description and guide must keep answering those searches.
- Confirm the Supabase database has room. It was 323 of 500 MB on November 4,
  mostly old `pg_net` responses. The new tables need about 15 MB.

## Phase 1 — Communities in the database (2–3 days)

**New tables**

- `places`: a reference list of towns with population, coordinates, country,
  state and county codes, and time zone. Loaded once from GeoNames
  `cities5000` (free, worldwide, about 55,000 rows). Used to find "the largest
  town in this county" and "is this a city of 50,000+".
- `communities`: slug, display name, country/state/town path, kind (`city` or
  `county`), county or city identifiers, centre point, time zone, created date,
  counts of accepted reports and confirmed cleanups, and the computed
  `is_indexable` flag.
- `community_overrides`: hand corrections, for example "Blowing Rock, Caldwell
  County, counts as Boone". Empty except for that kind of edge case.
- `reports.community_id`: set once, never recalculated, so rankings don't move.

**Assigning a report**

1. When a report becomes accepted (`funding_eligibility = 'eligible'`, the same
   moment rank points are awarded today), it is queued for assignment.
2. A small server job (a scheduled Supabase Edge Function, every minute) takes
   queued reports and looks up the spot's county and town with the existing
   OpenStreetMap lookup in `lib/report-town-lookup.ts`. It sends only a
   position rounded to about 1 km, one request a second, and caches answers.
3. It applies the rule: an override if one matches; otherwise the city if the
   town has 50,000+ people; otherwise the county. If that community doesn't
   exist yet, it is created with its name and address.
4. If the lookup fails, the report stays queued and is retried. It never lands
   in a wrong community.

**Backfill** the 74 existing reports with the same job, then compare the result
with the November 15 test: Boone 52, Avery County 7, Asheville 4, Greensboro 4,
Mar del Plata 3, Chorrillos 2, Wilkes County 1.

## Phase 2 — Leaderboard numbers (2 days)

One public database function, `community_leaderboard(community, board,
period)`, returning place, short name, rank bug, score and profile ID. It
excludes people who opted out, deleted or blocked accounts, sample reports,
unpublished reports and moderated reports.

| Board | Counts | Source |
|---|---|---|
| Reporters | Accepted reports | `rank_point_events` of type `report_created`, so the existing limits apply (5 a day, no points for a repeat spot within 25 m in 7 days) |
| Cleaners | Confirmed cleanups | `rank_point_events` of type `cleanup_completed` → `cleanup_attempts.report_id` |
| Funders | Cleanups funded | Distinct reports with a succeeded, non-refunded `cleanup_contributions` row. Counts cleanups, never dollars |

"This month" uses the community's own time zone. Ties share a place.

Also:

- `community_standing(community, board, period)` for the signed-in person:
  their place, score, and who is just ahead.
- `community_champions`: a scheduled job runs daily and records last month's
  winner for each community and board once that community's month has ended.
  Ties go to whoever reached the score first. These titles are permanent.
- A `profiles.show_on_leaderboards` setting, on by default.

## Phase 3 — The page (2–3 days)

- One route for every community: `/communities/[country]/[state]/[place]`,
  read from the `communities` table. Boone keeps its address. The current Boone
  page and `community-directory.ts` are retired; links to the old address keep
  working.
- Build the mock-up for real: bug badges for the three boards, medal places,
  Show all, "Updated" time, loading placeholders, the address remembering the
  board, arrow-key tabs, and the All-time fallback.
- Rows open the existing member profile window (`ReportAuthor`'s profile
  dialog), not a new one.
- **Your standing** under the board: signed in and on the board, signed in and
  not yet, signed out.
- **Share my rank**: an image made per person (same approach as the existing
  social cards), with Copy link and Save image. Referral tracking is not part
  of this plan.
- **Past champions** beside the board: last month featured, earlier months
  listed.
- **Local help**: Boone's reviewed groups become the need-named cards, and the
  five Boone guide questions appear on the page as fold-open questions.
  Towns without reviewed groups don't show the section.
- Empty states for new towns: "No cleanups in Asheville yet this month."

## Phase 4 — Search and answer engines (1 day)

- **Title and description per town**, about cleanups rather than leaderboards,
  for example "Boone, NC litter cleanups and local leaderboard | Litterbugs".
  Adjust Boone's to keep the Phase 0 queries.
- **A plain stats sentence** in the page description and structured data,
  updated daily: "In November 2026, Litterbugs members in the Boone area
  reported 23 spots and cleaned up 9." AI answer tools quote sentences like
  this. It does not appear on screen.
- **Structured data**: place, breadcrumbs, and the guide questions as
  questions and answers.
- **Indexing safeguard** from above: `noindex` until 5 accepted reports or 1
  cleanup. Sitemap and `llms.txt` list indexable communities from the
  database, with their real last-activity date.
- The Communities page lists every public community, largest first, and its
  search finds them by name or county.

## Phase 5 — Opt-out setting (½ day)

- Website account settings: "Show me on community leaderboards", on by
  default. Turning it off hides the person from every board in every town
  straight away; their reports and cleanups still count toward the town's
  totals.
- The mobile app gets the same switch in a later app release.
- Update the privacy policy: community pages show a first name and last initial
  with counts of reports, cleanups and cleanups funded, and how to turn it off.

## Phase 6 — Analytics, testing and release (1–2 days)

- Keep the existing community events (`community_opened`, resource clicks).
  Add board changed, Share my rank opened and link copied.
- Tests: the community rule (Boone, Avery, Asheville, Lima examples), name
  shortening, opt-out, ties, month boundaries by time zone, the All-time
  fallback, the indexing threshold, and the page on phone and desktop.
- Review on localhost with real (local) data before anything goes live, as
  usual.
- Production needs Grant's go-ahead twice: once for the database migrations
  and backfill, once for the website release. The website goes out through the
  usual release procedure: an isolated release branch built from the live
  source, a staged Vercel build, then promote.

## Size

About 1½–2 weeks of focused work across Phases 0–6.

## Not in this plan

- Referral tracking on shared links.
- The opt-out switch inside the mobile app (Phase 5 covers the website).
- Champion badges on member profiles.
- Reviewed local groups for towns other than Boone.
