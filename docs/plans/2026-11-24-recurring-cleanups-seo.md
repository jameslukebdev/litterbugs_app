# Recurring cleanup SEO — architecture recommendation

Owner subsequently approved local implementation. Source8e904b9 implements grouped
normal directories and /sites/<stable-id> overviews for recurring locations,
retaining every original report URL/self canonical and occurrence Timeline.
Singletons keep original card URLs/canonicals. The overview has factual WebPage,
Place, ItemList and breadcrumb markup; new sitemap rows supplement old report rows.
The real local pages use current public reports, not illustrative fixture records.
Local responses remain noindex; hosted migration and deployment are still prohibited.
This is implementation/renderer verification, not a Google indexing or ranking result.
See the current local implementation review for verified paths and release limits.

Original review: November24,2026. Discussion/research only. No canonical, sitemap, redirect or
search submission change authorized or implemented in this review.

Preserve the existing /reports and /cleanups directories as separately useful
indexable destinations. A new active occurrence belongs to /reports. Its earlier
completed cleanups remain in /cleanups with their original stories and URLs.

Proposed stable site overview for recurring locations: current condition first,
current report/fund/cleaner/reporter attribution, concise cumulative impact and the
integrated Timeline. It links each dated occurrence. Do not create a second thin
overview for every singleton report. Settle the neutral stable URL pattern before
implementation; do not include changing status or reporter in the identity.

Keep each existing /litter-reports/<title>-<town>-<report-id> page as its own report
or completed-cleanup record, with its own primary text/photos/author/dates, title,
description and self canonical when it remains a distinct substantial record.
Keep /reports/<id> compatibility links and all existing evidence/receipt identities.
A new litter report is a new occurrence URL, not a rewrite of the old cleanup.

The full combined history belongs primarily on the site overview. Occurrence pages
should emphasize their own recorded round, with a concise site history/link, rather
than cloning the entire site story as primary content on every URL. Historical
pages link to the latest site condition; the active site view never links to itself
as View current report. Cleanup cards can show factual New litter reported status
without relabeling or deleting their recorded successful cleanup.

Canonical relationships identify duplicate versions of the same content, not
different reporting/cleanup rounds. Do not point all historical pages at the latest
report or indiscriminately301 them there. If an actual duplicate URL is retired,
map it to an equivalent destination deliberately; do not combine this feature with
a broad URL migration.

Keep canonical URLs, internal links and sitemap entries consistent. Add an overview
only when it has distinct useful content. Use lastmod for actual significant page
changes, not requests or cosmetic timestamps. Serve important status/history/links
in server-rendered HTML. Structured data must match visible current vs historical
facts; current Article/Place/Breadcrumb markup does not guarantee rich results.

Primary sources:
- https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://developers.google.com/search/docs/crawling-indexing/javascript/fix-search-javascript

Bounded live evidence: seo audit-urls processed3/3 requests,3 final200 documents,
zero failures. Existing report id URL307 redirects to its readable address.
Sample: /reports, /cleanups, /reports/3906e5ce-cd04-4ccf-8e9f-4fa754546019.
Not a full crawl, Google indexing check or traffic baseline. GSC and GA joins were
skipped (no property selected), so no rankings/clicks/authority claims. TikTok403
blocked external verification; no source link was changed.

The raw-response crawler flagged canonical_outside_head on all three pages and
extracted Please wait as main text despite detecting streamed titles, links and
Article markup. Treat these as streaming/rendering verification observations.
Installed Next16.3 generateMetadata documentation explicitly describes body-streamed
metadata for JavaScript-capable crawlers including Googlebot. Need URL Inspection /
rendered DOM verification before calling this an SEO defect or modifying config.
The catalog's per-check guidance request returned INVALID_INPUT (not available);
the report's direct recommendation and primary docs were reviewed instead.

Before release: record current indexed URLs and available GSC page performance;
test canonical/head/rendered-content and redirects on representative active,
completed, historical and recurring site pages; verify old links still200 and
preserve their intended stories, real404 handling, sitemap dates, anonymous access
and staging noindex. Re-run the same bounded URLs after any eventual deployment.
No SEO setup can guarantee zero ranking fluctuation.
