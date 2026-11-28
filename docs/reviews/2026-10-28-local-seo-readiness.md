# Local SEO and usability readiness review

Reviewed October 28, 2026. Review only: no application changes, deployment, live submissions, or database writes.

## Scope and limitations

SEO Skill crawl `crawl_04cd72b9df784c159c3043413e55f073`: capped at 12 pages, depth 2, JavaScript off, no sitemap expansion. Partial coverage; all 12 fetched documents returned 200. Exclusions included map, report, sign-in, account, get-app; report-prefix exclusion also omitted reporting URLs, so separate direct HTTP checks covered `/report-litter` and the local hub. No Search Console or analytics joined. This is not a full index audit or a performance certification. Automated issue counts include expected local HTTP, noindex, and localhost-versus-127.0.0.1 differences and must not be used as launch-defect totals.

Additional direct checks covered homepage, reporting/cleaning/funding guides, directory, Boone hub, archive, archive page 999, map, robots and sitemap. Source review covered metadata, feeds, geography, navigation and URL configuration. Browser inspection checked the homepage at an effective 390 CSS pixel viewport and the user's narrower pane. Previous 440 passing tests/build are prior implementation evidence, not tests rerun during this review. No signed-in report submission, financial transaction, real-device Safari test, or production performance test occurred.

## Fix before launch

1. **Empty archive pages remain successful, self-canonical pages.** `/cleanups?page=999` returns 200 with no records, a page-999 canonical, and no page-specific noindex. Local noindex masks this until launch. `apps/web/app/cleanups/page.tsx` handles empty results only as display copy. Return a not-found/noindex state for genuinely out-of-range pages; distinguish backend failure from nonexistence. Validate page 1, last valid page, next invalid page, malformed/repeated page parameters, and an unavailable feed. Google documents empty success responses as potential soft 404s: https://developers.google.com/crawling/docs/troubleshooting/http-status-codes

2. **Identical report labels mean different actions.** Header/hero Report litter links start `/report`, while the participation navigation uses Report litter for `/report-litter`. Rename the educational link (How reporting works) and distinguish the start action consistently. Check keyboard navigation and sign-in return-to-report behavior.

3. **Make payout eligibility visible with the earnings pitch.** The homepage puts 18+/eligible US Stripe and approval conditions inside a collapsed reward FAQ, whereas the hero emphasizes earnings and the site feels global. Keep the earnings hook and add a short nearby qualification with a guide link. This is a clarity recommendation, not a new eligibility rule or legal assessment.

4. **Improve narrow-screen search and secondary navigation.** At effective 390px width the search input is ~170px and the placeholder is visibly clipped. The secondary navigation has 549px content in a 376px viewport, hiding later destinations horizontally. Use a shorter visible search label or stacked button; make all guide destinations easily discoverable on mobile, and add a skip-to-content link (none found). Focus styling exists and the search button was keyboard-focusable. Evidence: `2026-10-28-seo-evidence/mobile-search.jpg`. At the user's ~299px pane the input is only ~79px, making the problem worse.

## Launch verification gates, not proven production defects

- Ensure `NEXT_PUBLIC_SITE_URL=https://litterbugs.app` in the production build, one preferred host, appropriate HTTPS/host redirects, and production canonicals/sitemap pointing to it. Current local canonicals use localhost; this is expected locally. `getSiteUrl()` silently falls back to localhost, so a production validation guard would prevent a configuration mistake.
- Retain local/preview noindex. Verify it is absent from intended public pages at release while map/account/report-creation exclusions remain. Current proxy excludes only the known production hostnames from its local noindex header.
- Measure production-mode loading on a throttled mobile profile. Guides/homepage await report feeds; completed cards involve several reads per record. Report images are unoptimized. These are performance risks to measure, not established Core Web Vitals failures. Exercise slow/unavailable feeds and broken/withdrawn images without compromising privacy checks.
- Establish organic-acquisition measurement and successful-report, contribution and approved-cleanup outcomes. No common analytics integration was found in the web source; external tag injection was not audited. Confirm consent approach and avoid private report content in analytics. Verify Search Console access/baseline and inspect representative URLs only when publication is authorized.
- Recheck complete signed-in journeys in an appropriate test environment after final changes. Do not create test payments/reports in the current live-backed preview. Previously excluded Apple/separate-user Facebook testing remains excluded.

## Recommended polish; not launch blockers

- Add a branded Open Graph image/title/description and social-card metadata to the homepage and core guides. Direct HTML checks found no og:image on these seven core pages. Individual report sharing has its own metadata and is not the same finding. SEO Skill rule: `og_image_missing`; principle: supply a representative fetchable sharing image. Verification: inspect resulting HTML and test a local social-preview renderer, followed by live crawler checks only after launch authorization. Per-check tool guidance was unavailable for this report type.
- Make some headings more descriptive while keeping brand language: reporting guide H1 is currently “Spot litter. Start something.” Archive H1 is “Reports that became results.” Their titles already explain the subject, so this is clarity polish rather than proof of a ranking defect. Keyword demand and homepage/reporting-guide overlap still need evidence from keyword research/Search Console.
- Add truthful Organization/WebSite/Breadcrumb structured data where useful. Do not delay launch for FAQ rich-result promises, llms.txt, invented location pages, or a large blog rollout.
- General location labels currently exist only for the verified Boone postal-area model. Other reports remain unlabeled rather than guessed. Expand geography carefully as real communities grow.

## Automated flags discounted

- Local HTTP/noindex/nofollow and localhost canonical differences are expected preview controls.
- The crawler extracted “Loading…” as the main content for several streamed pages, although complete response checks and the browser expose their actual text. Do not claim these are empty pages from that parser result.
- The archive canonical is streamed outside head for ordinary/Googlebot requests but included in head for Twitterbot. Next documents this streaming behavior; it is not by itself a proven Google indexing defect: https://nextjs.org/docs/app/api-reference/functions/generate-metadata#streaming-metadata
- The hero oversized-image flag was inferred from a 3840w srcset candidate, not measured transferred bytes. Do not claim an oversized download without checking actual currentSrc/network delivery.

Recommended sequence: archive handling; navigation/mobile clarity; earnings qualification; social metadata and production URL guard; production-mode performance/accessibility and test-account journey checks; measurement setup; separately authorized publication and Search Console verification.
