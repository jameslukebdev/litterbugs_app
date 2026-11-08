# Litterbugs SEO growth plan — November 8, 2026

## The automatic foundation is already in place

Publishing an eligible public report creates its permanent page, exposes it in the live sitemap and links it from a directory. Completing a cleanup updates that same page with real outcome evidence. Google discovers the URL, crawls it and decides whether to index it. Indexing makes a page eligible for search; ranking and useful visits are separate outcomes.

The November 8 audit verified all 29 current report/cleanup pages and their directory links. Google URL Inspection's baseline was 17 indexed, 9 discovered but not indexed and 3 unknown. All three unknown URLs received accepted priority-crawl requests in the preceding task. Requests for the other nine are recorded separately in this task's request log. Those counts must not be updated to indexed simply because a request was accepted. The subsequent manual request for the expired patio report was rejected: Google's live test successfully fetched and rendered it, allowed crawling/indexing and classified it as a soft 404. Accessibility and allowed directives alone do not establish that Google will accept a page's content.

Manual requests are useful for selected delayed pages and important updates. Routine publishing does not need one manual request per page. Do not repeatedly request the same unchanged URL, automate Search Console clicking, or use Google's restricted Indexing API for ordinary report pages. Keep the existing sitemap available at the same address; Google controls revisit frequency and inclusion.

## Grow the value of the pages as real activity grows

1. **Reports:** use specific, accurate titles and meaningful contributor descriptions. Include only verified public locality information; do not expose exact/private locations for search coverage. Avoid invented descriptions and repetitive filler.
2. **Cleanup proof:** preserve original reports, before/after photos, actual completion dates, cleaner descriptions and reported removal quantities. Distinguish cleaner-reported quantities from independently measured facts.
3. **Community pages:** strengthen Boone first with its actual reports and results. Add further community hubs when verified geography and enough distinct real activity support a useful page. Do not generate empty city pages just to expand the page count.
4. **Connections between pages:** keep reports linked from active/completed/history directories and their relevant community. Retain one permanent URL through status changes so existing links continue working.
5. **Local awareness:** invite real partners, participating organizations and local coverage to link to relevant cleanup/community stories. This is a proposed growth activity; no outreach or third-party publication is authorized by this document.

These are recommendations informed by the current page architecture, not claims that missing narrative or links caused Google's exclusions. The excluded URLs include older pages as well as recent ones; age alone does not explain their status.

## Measure outcomes and choose the next improvement

A weekly review should:

- Inventory the live sitemap, newly added pages and new completed-cleanup evidence.
- Run bounded URL Inspection for new, previously delayed or changed pages, recording exact states, timestamps and provider failures. Compare with saved snapshots; do not infer indexing from traffic rows.
- Check HTTP status, robots, canonicals, photo availability and links for affected pages. Use a small targeted check before another broad crawl.
- Compare completed Search Console periods: the last 7 days with the preceding 7, and 28-day periods when traffic is too sparse. Track impressions/clicks and useful landing pages; distinguish branded from unbranded discovery when the returned queries permit it.
- Connect organic acquisition to actual reporting, funding and cleanup participation only when the site's available analytics can support the attribution. Preserve visitor analytics and staff/test exclusions.
- Return a short finding, the most useful next improvement and any concrete blocker. Do not treat more indexed URLs as proof of more participants or revenue.

The November 8 query-level Search Analytics check (October 8–November 6, finalized web data, 100-row cap) returned only two visible query rows: “litter bugs” and “litterbugs.” This is sparse, privacy-filtered evidence, not proof that no one searches for other phrases. Ideas such as local litter reporting, cleanup participation and funding need demand validation before commissioning substantial new content.

## Additional indexing requests completed

All nine requested URLs received manual indexing requests. Google accepted seven into the priority crawl queue. It rejected two expired reports as soft 404s: “Basura en el patio” (/reports/42dd5736-8b33-41a0-951c-2d5db84e113a) and “Sand trash” (/reports/ed1500be-2555-4504-9421-6a72451c3ea6). Both live tests report successful fetches and allow crawling and indexing. The patio tested-page screenshot shows the real report, its expired state and original details, rather than an application error screen.

These two records have no report photo in the audited page/sitemap model and little original detail. That is a content-review lead, not proof of Google's classification cause. Another expired report with more history received an accepted request, so do not treat expiry alone as the diagnosis. Preserve truthful history and contributor facts. More useful original evidence would be preferable to filler or merely disguising expiry language; whether these sparse records should remain search targets requires an evidence-backed content decision.

Exact per-URL outcomes and capture filenames are in `2026-11-08-additional-indexing-requests.json`; screenshots are in `assets/2026-11-08-indexing/`. Including the three accepted requests in the preceding task, 10 requests were accepted and 2 rejected across the 12 initially unindexed report URLs. This does not replace the 17-indexed baseline with 27 indexed URLs. The weekly check will inspect Google's later decisions and track the soft-404 issue, rather than repeatedly submitting unchanged pages.

No application or database content, publication policy or deployment changed. Google live tests rendered the site and may execute visitor scripts; identify approximately 4:23–4:32 p.m. Eastern November 8 Google Inspection Tool activity as testing if it appears in analytics. No normal visitor analytics setting was disabled.

The owner explicitly approved a weekly SEO check in this chat on November 8. Created and verified the active thread automation `weekly-litterbugs-seo-check`: Mondays at 9 a.m. America/New_York, returning updates to this chat. Its prompt covers monitoring and recommendations, not autonomous content publication, outreach, database edits, website deployment or repeated indexing requests. Local scheduled work requires the computer and desktop app to be running.

## Verification and sources

**Later November 8 repair:** At the owner's request, release `f3995d7` on the
exact live `f08518c` baseline was staged, checked and promoted as
`dpl_9ESdGAzEhqQTBG92YFcsSoXyh8sD`. Expired pages now present actual report
evidence and dated history while retaining the expired status and unconfirmed
outcome. No photos or facts were fabricated and no database records changed.
Google accepted the repaired Sand trash indexing request. The repaired patio
page's separate live test now says “URL is available to Google” and “Page can be
indexed”; its manual submission hit the daily quota and remains pending a quota
reset. These clear the observed soft-404 eligibility failures, not proof of
actual indexing. Preserve the preceding request results as historical evidence;
future weekly checks should use this post-repair baseline and inspect actual
index states. No automated submission retry was scheduled.

- Current evidence: `2026-11-08-report-cleanup-indexing.md`, its saved crawl data and Google inspection JSON.
- Google automatic discovery and SEO guidance: https://developers.google.com/search/docs/fundamentals/seo-starter-guide . Validate growth work against actual search and participation outcomes over several weeks rather than promising immediate ranking gains.
- Crawl requests, timing, quotas and lack of inclusion guarantees: https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl . Verify requests through Search Console's explicit acceptance state and later verify indexing through URL Inspection.
- Sitemap behavior and accurate update dates: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap . If reliable content-update timestamps are implemented later, use them for lastmod; never substitute the date of every sitemap render.
- Google Indexing API scope: https://developers.google.com/search/apis/indexing-api/v3/using-api . Ordinary report/cleanup pages do not qualify for its job-posting/livestream indexing notifications.
- Soft 404 classification: https://developers.google.com/search/docs/crawling-indexing/http-network-errors#soft-404-errors . Review Google's actual tested page and available original content before choosing a repair. Do not fabricate content, alter contributor facts, or remove honest expiry status just to pass a live test.
