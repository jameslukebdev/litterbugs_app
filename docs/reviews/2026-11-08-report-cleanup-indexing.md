# Report and cleanup page indexing audit — November 8, 2026

The automatic public-page and sitemap pipeline is working. Google URL Inspection confirms 17 of the 29 report/cleanup URLs are indexed; 9 are discovered but not indexed and 3 are unknown in the API snapshot. This is a complete inspection of the 29 URLs in the live sitemap at audit time, not a promise of eventual inclusion.

**Follow-up live-test finding:** The owner's subsequent request to submit the other nine URLs uncovered Google soft 404 classifications on the expired patio and Sand trash reports. Google successfully fetched both and allowed crawling/indexing, but rejected their manual indexing requests. The patio tested-page screenshot shows its actual report content. Google accepted the other seven requests. The earlier checks established HTTP/directive eligibility and Google's saved index snapshots; they did not rule out content-level exclusions in a live Google test. See `2026-11-08-seo-growth-plan.md` and the subsequent request evidence. Do not interpret this audit as proving every report is accepted by Google.

## Verified live

- Sitemap: https://litterbugs.app/sitemap.xml . All 47 listed document URLs return HTTP 200. Sitemap health report: `crawl_09784538f4294ba99141a80ddea197ff`.
- Individual public pages: 14 active reports, 11 completed cleanups, 4 expired reports. All 29 return 200, allow indexing, have self-referencing HTTPS canonicals, unique titles/descriptions, and server-rendered report content with JavaScript disabled.
- Direct directory HTML checks: /reports links to 12 reports, /reports?page=2 to 2, /reports/history to 4, /cleanups to 11. These account for all 29 sitemap report URLs, with no missing directory links.
- All 38 image URLs listed in the sitemap return HTTP 200 with nonempty image content and no X-Robots-Tag restriction.
- robots.txt permits public pages, excludes only /api/, and advertises the current sitemap.
- Search Console Sitemaps UI: submitted November 3; last read November 7; Success; 45 discovered pages. Live sitemap has since grown to 47. No need to resubmit the same sitemap for each new report.
- Search Console indexed snapshots: all four inspected discovery hubs (/reports, /reports/history, /cleanups, Boone community) are indexed.
- Report URL breakdown: active 9/14 indexed, completed 7/11 indexed, expired 1/4 indexed.
- Search Analytics, October 8–November 6, finalized web data, 1,000-row cap: 22 returned page rows. Three report detail URLs had 5 impressions combined and 0 clicks. Missing Search Analytics rows are not treated as exclusion evidence.

## Automatic behavior and intentional boundaries

Source review confirms the sitemap and report route run at request time. The sitemap loads published, nonsample, publicly shareable records using anonymous permissions. Report completion changes the existing /reports/{id} page to show cleanup outcome, cleaner, dates, reported removal quantities and before/after photographs; it does not create a competing /cleanups/{id} URL.

Expired public reports remain in history and on their original URLs. Unpublished, sample, explicitly withdrawn and account-deletion-anonymized records are intentionally excluded. No publication permissions or privacy boundaries were changed.

The sitemap deliberately omits report lastmod because there is no maintained content-updated timestamp. Adding today's date at every request would be misleading. The currently indexed cemetery report was crawled November 6 and completed November 8: URL indexing does not prove Google has recrawled the latest cleanup content.

## Google URL Inspection baseline

All 33 requested inspections succeeded; no failures, quota skips or deferrals. Collected November 8 at 21:09–21:12 UTC. The evidence file preserves exact timestamps and responses. URL Inspection is Google's saved index snapshot, not a live fetch.

| Page | Current site state | Google coverage | Last Google crawl (UTC) |
| --- | --- | --- | --- |
| [Litter Report](https://litterbugs.app/reports/04001e36-1dcf-4bf7-b3b6-208ae50288f6) | Expired | Submitted and indexed | 2026-10-02T01:28:13Z |
| [Trash in creek near drainage behind circle k](https://litterbugs.app/reports/07c9ac7e-bc36-4fc3-989b-81cbf0fc92d9) | Active | Submitted and indexed | 2026-10-26T07:34:38Z |
| [Trash all over woods behind New River Grill/New Market Center](https://litterbugs.app/reports/0e39be7a-ef52-450c-a415-3f0236ad92e6) | Active | URL is unknown to Google | None reported |
| [Greenwood Lot](https://litterbugs.app/reports/16c6df5b-8a92-4f7f-a4cd-22935a6c9c37) | Completed | Submitted and indexed | 2026-10-30T13:28:53Z |
| [Shopping carts](https://litterbugs.app/reports/1e7f1168-46d4-4e10-9ab3-d781d9314ab0) | Active | Submitted and indexed | 2026-10-30T13:35:42Z |
| [Trash near road and in gutter near Boone auction place](https://litterbugs.app/reports/2399f96b-2a47-442f-beff-7a1453a2b1e2) | Active | Submitted and indexed | 2026-10-28T08:08:25Z |
| [Trash on Castle Ford](https://litterbugs.app/reports/25b202b4-b36f-47b8-b50d-a77de060d702) | Completed | Discovered - currently not indexed | None reported |
| [Trash at Beacon Heights Trail Head](https://litterbugs.app/reports/3906e5ce-cd04-4ccf-8e9f-4fa754546019) | Completed | Submitted and indexed | 2026-11-03T20:53:17Z |
| [Basura en el patio](https://litterbugs.app/reports/42dd5736-8b33-41a0-951c-2d5db84e113a) | Expired | Discovered - currently not indexed | None reported |
| [Litter along Ridge Road on other side of guardrail](https://litterbugs.app/reports/62fbcc67-1f15-429f-bb12-46058c6cfdf6) | Completed | Submitted and indexed | 2026-10-02T02:19:34Z |
| [Lots of trash near steps to Greenwood Lot](https://litterbugs.app/reports/68256b51-06ad-4bf1-8e9f-a7a42e2e4631) | Completed | Submitted and indexed | 2026-10-30T11:07:34Z |
| [Trash along hillside at Tractor 🚜 Supply](https://litterbugs.app/reports/79a64227-1573-43e8-a309-fd5e4bceb29f) | Active | Submitted and indexed | 2026-10-28T19:37:22Z |
| [Trash in front of Toyota Dealership.](https://litterbugs.app/reports/7a159346-d9e0-4261-aaae-b71a56738dea) | Active | Submitted and indexed | 2026-10-28T07:06:14Z |
| [Trash along creek above Watauga Library](https://litterbugs.app/reports/7b20f1ec-41a8-4eba-be86-f3608250638e) | Completed | URL is unknown to Google | None reported |
| [Litter along entrance to industrial drive](https://litterbugs.app/reports/7dccfd3a-3ced-4af9-9816-339c16559a54) | Active | Submitted and indexed | 2026-10-29T00:59:39Z |
| [Litter along Winkler’s Creek Greenway and 321 Pedestrian Underpass](https://litterbugs.app/reports/80fa643d-b494-4975-96e8-99eb6dcbe714) | Active | Submitted and indexed | 2026-11-07T15:39:56Z |
| [Bottles strewn about at Linville intersection](https://litterbugs.app/reports/89b69641-d5f2-4604-8228-e503fbb3a37d) | Completed | Submitted and indexed | 2026-10-29T00:59:40Z |
| [Crazy amount of litter at intersection](https://litterbugs.app/reports/94ff2afa-939f-4f32-bd25-850f45ebbd44) | Active | Discovered - currently not indexed | None reported |
| [Basura en el parque](https://litterbugs.app/reports/a0a47f46-8d85-4c13-8d37-50f8c4c0b525) | Completed | Discovered - currently not indexed | None reported |
| [More cleanup needed near Pinnacle storage.](https://litterbugs.app/reports/af670681-64a8-451c-8d7e-8d7701912506) | Active | URL is unknown to Google | None reported |
| [Ridge Road cleanup part 2 - more cleanup needed](https://litterbugs.app/reports/ba227d19-b46d-46fa-a02c-7d1f4c5047c3) | Completed | Discovered - currently not indexed | None reported |
| [Ridge Road cleanup part 3 - one last pile](https://litterbugs.app/reports/cc0f660d-4af4-4db0-8f29-f6ec0bd3b07e) | Expired | Discovered - currently not indexed | None reported |
| [Litter at corner of Howard’s Creek Road near C&T](https://litterbugs.app/reports/ce154938-f7c9-40d9-99bc-4a5d43710aa0) | Active | Discovered - currently not indexed | None reported |
| [Trash by the tracks](https://litterbugs.app/reports/d4a3dc34-edc1-4492-b6ac-e6dd82375a5c) | Active | Submitted and indexed | 2026-10-30T09:53:46Z |
| [Basura en la calle](https://litterbugs.app/reports/dd2bcb17-f7f9-4b3e-b0bf-4ad31e7cbe95) | Active | Discovered - currently not indexed | None reported |
| [Trash scattered along hillside and near drainage next to pinnacle storage](https://litterbugs.app/reports/e08939ae-3404-4e43-81f6-f4a2e1c77c4d) | Completed | Submitted and indexed | 2026-10-28T10:33:56Z |
| [Bags and trash](https://litterbugs.app/reports/e9beb87f-4c94-4565-abb0-01f384ca424d) | Active | Submitted and indexed | 2026-11-01T04:37:46Z |
| [Trash along perimeters of historic winkler cemetery](https://litterbugs.app/reports/ea46b81e-7000-4f5f-82af-64a6c624e040) | Completed | Submitted and indexed | 2026-11-06T01:21:43Z |
| [Sand trash](https://litterbugs.app/reports/ed1500be-2555-4504-9421-6a72451c3ea6) | Expired | Discovered - currently not indexed | None reported |

## Assessment and follow-up

### Completed crawl requests

Requested indexing in Search Console for the three URLs the API baseline called unknown:

- Library cleanup: /reports/7b20f1ec-41a8-4eba-be86-f3608250638e . The interactive inspection already described it as discovered. Google accepted the request and displayed “Indexing requested” / added to a priority crawl queue.
- New Market report: /reports/0e39be7a-ef52-450c-a415-3f0236ad92e6 . Google accepted the request with the same priority-queue confirmation.
- Pinnacle Storage follow-up report: /reports/af670681-64a8-451c-8d7e-8d7701912506 . Google accepted the request with the same priority-queue confirmation.

Acceptance screenshots for the library and New Market requests accompany this audit. Acceptance does not change the 17/29 baseline to indexed. Do not repeatedly submit the same URLs: Google says that will not improve their queue position. Reinspect these and the older discovered URLs after Google has had time to crawl; no recurring automation was created.

No technical publication, sitemap, crawl-access, canonical or directory-link blocker was found for these 29 pages. The excluded pages have live indexable equivalents; Google has not reported a noindex or robots denial for them. Two unknown API URLs were first reported November 7; the library cleanup is older and warrants a priority crawl request. Search Console's interactive library inspection already calls it discovered, illustrating that Google surfaces can update at different times.

The nine discovered URLs include older pages; do not describe every exclusion as a new-page delay. Actual exclusion cause cannot be inferred from live word count or from the absence of a crawl timestamp. Improve location-specific factual descriptions and cleanup evidence where contributors can supply them, without invented text or private locations. Several titles are long enough to truncate; this is display polish, not a demonstrated indexing block.

Google controls inclusion and crawl timing. Even an accepted indexing request is not an indexing guarantee: https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl .

## Scope and evidence limits

The broader full crawl (`crawl_fdb0029169ff45bf9fcb73c79b97ec8d`) stopped at 120 pages with JavaScript disabled. It includes utility/map/query variants, many intentionally noindex, and 4 external destinations not reachable after bounded checks. Its aggregate warnings are not findings against every report. All 47 sitemap URLs were covered by health checks and all 29 report detail URLs by content and Google inspections; no whole-site all-clear is claimed.

Public-site verification used HTTP requests without executing visitor analytics. Browser checks were confined to Search Console. No test report or cleanup was created, no user content changed, and no application/database deployment was needed.
