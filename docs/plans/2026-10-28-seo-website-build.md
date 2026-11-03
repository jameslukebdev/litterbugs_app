# Litterbugs SEO website build — corrected scope

## Objective

Build the connected public website described in “Plan Litterbugs SEO homepage” and “SEO strategy for Litterbugs.” The homepage introduces a geographically broad platform; Boone is its first local community and an honest source of early examples. Keep the reporter earnings acquisition angle, a restrained Zillow-inspired presentation, and direct access to the application.

This document is a build plan, not an implementation completion report. Keep all subsequent work local for review until publication is explicitly authorized. Mobile applications are outside scope.

## Evidence and current gap

The existing `/home-preview` is only a visual/functional homepage prototype. It does not implement the planned public reporting page, funding explanation, map migration, local content model, or connected discovery structure. It fixes three Boone report IDs in code, includes “Litter reports near Boone” and “Explore Boone,” and restricts its Google location search to the United States. Those choices make the page feel geographically limited.

Current application facts verified October 28, 2026:

- `/` renders `MapExperience`; `/report` imports that root page and requires authentication. Replacing `/` without extracting the map would break the reporting flow.
- `/cleaner` is a public page that can be expanded. `/report-litter`, `/fund-a-cleanup`, `/map`, and location hubs do not yet exist.
- Public report URLs and privacy-aware photo routes already exist. Preserve them and reuse publication rules.
- Public report summaries have no verified city/country association. Do not infer locality from the report title or publish precise coordinates to manufacture local SEO content.
- Reporter reward eligibility currently requires an eligible US Stripe payout account. A global brand presentation is not evidence of worldwide payout or service availability.

## Page structure

| Destination | Purpose and required content |
| --- | --- |
| `/` | Broad introduction; reporter action; location search; current public reports; Report/Fund/Clean pathways; real completed work; a few short answers. |
| `/map` | Existing interactive map/list and filters. Preserve map state and direct report selection; initially noindex and exclude from sitemap. |
| `/report-litter` | Public explanation of suitable reports, photos/location, free submission, visibility, community response, government-notification distinction, unclaimed reports, expiry/renewal, and conditional reporter rewards. Start-report actions near top and bottom. |
| `/report` | Existing authenticated report creation, preserved independently of homepage content. |
| `/cleaner` | Expand existing page: funded versus volunteer opportunities, safety/access, eligibility, claiming, evidence, review, payout, and links to current available reports. |
| `/fund-a-cleanup` | Explain contributions to individual reports, fees, approval/review, refunds and unsuccessful cleanups using actual current policy. Show completed examples and eligible reports. |
| `/support` | Continue to mean support for running Litterbugs; keep distinct from funding an individual cleanup. |
| `/reports/[id]` | Preserve permanent report URLs. Add verified general locality and contextual links when available; retain status, dates, before/after evidence, and recorded impact. |
| `/locations` | Browse communities that have useful public content. Introduce as a destination when the first substantive hub is ready. |
| `/locations/[place]` | First substantive hub for Boone. Use a geography model that includes country and administrative area; choose unique stable slugs with that context before expansion. |

## Homepage direction

Retain the reporter-first hook, with the condition adjacent to it. Proposed title: “Report Litter & Earn Reporter Rewards | Litterbugs.” Explain the whole process in the introductory copy: reporting identifies a spot, contributions support the work, and someone completes the cleanup. The reward remains a meaningful benefit, not a promise of payment for merely uploading a photo.

Use this compact sequence:

1. Simple navigation: Map, Report, Clean, Fund, account access.
2. Reporter headline, short explanation, clear Report litter action, location search.
3. Actual current report cards, chosen by eligibility and recency rather than fixed city IDs.
4. Short Report / Fund / Clean explanations linking to the full public pages.
5. Genuine before-and-after cleanup evidence, with its actual general location.
6. Brief answers and links to fuller reporting/reward guidance.

Use “Recent litter reports” only for a truly recent selection, or “Featured litter reports” for editorial selection. “Near you” requires a visitor-selected location or an explicitly permitted location lookup. If an area has no reports, explain that and offer reporting or a wider search; never substitute distant reports under a nearby label.

Remove Boone-specific homepage headings and the permanent “Explore Boone” action. Boone can remain visible as the location of a real card or case study and within Explore communities. Do not add invented activity in other places to create the impression of scale.

Use “Search by city, region, or postal code” language. The search design should support country-aware results and avoid a silent US-only assumption. Before changing geographical operating scope, verify reporting, geocoding, moderation, funding and payout restrictions separately. The implementation should show actual eligibility and availability, not promise worldwide rewards. Country-aware data does not require launching translations or country landing pages immediately.

## Build order

### 1. Website foundation and complete core journey

- Extract shared map rendering/data loading from the current root page, with `/map` and `/report` consuming it.
- Replace the local root with the corrected homepage; preserve the prior prototype as reference until the replacement is verified.
- Route recognized legacy map-state URLs (such as `/?report=…` and `/?view=map`) to `/map`, retaining relevant state. Ordinary root visits and marketing parameters stay on the homepage.
- Update map links, reporting cancellation, authentication returns, and back navigation across web routes. Keep existing public report URLs stable.
- Build `/report-litter` and `/fund-a-cleanup`, and strengthen `/cleaner` in the same reviewable local version. Do not use `/about` as a substitute for the dedicated reporting guide.
- Introduce a shared public navigation/footer so moving between public pages feels like one website.

### 2. Data-backed discovery and lasting evidence

- Load a bounded selection of eligible public reports for homepage cards. Handle withdrawn, expired, private, sample, and unavailable reports consistently.
- Define verified public geography: country, administrative area, locality and a stable place association, separately from protected precise report locations.
- Associate existing reports only after verification; allow missing locality rather than inventing it.
- Improve original report pages with general-location labels and relevant participation/local links. Preserve useful completed records after active-map removal.
- Build one substantial Boone hub with real activity, completed outcomes, participation instructions, and verified local resources. Expand only when another community has distinct useful content.
- Add a browsable cleanup archive when the collection warrants one; do not create a duplicate blog post for every report.

### 3. Search foundations and measurement

- Deliver public explanations and links in initial HTML. Keep the full map out of the homepage bundle.
- Assign unique descriptive titles, descriptions and canonical URLs; update sitemap entries for useful public pages. Keep preview, private/account pages and map filter combinations out of the search strategy.
- Review existing sitemap entries individually instead of assuming every public route should be listed. Check the existing app-download canonical/sitemap separately without changing mobile applications.
- Add structured data only where it truthfully represents visible content and a supported page type; do not treat schema as a substitute for content.
- Capture organic acquisition through successful first valid reports, successful contributions, and approved cleanups. Button clicks are supporting diagnostics. Verify existing analytics/consent before selecting instrumentation.
- At publication time, inspect representative URLs in Search Console and establish a baseline. Access and results have not been verified in this review.
- Add practical guides only where core pages do not already answer the same intent. Official reporting resources belong in region-specific guidance where appropriate.

## Acceptance criteria for the next local preview

- The user can browse the homepage, reporting explanation, cleanup explanation, funding explanation, real report detail and map as one coherent website.
- No homepage headline, default section or primary navigation makes Litterbugs appear limited to Boone.
- Search results identify geography clearly; nearby/featured/recent labels are accurate; empty locations are handled honestly.
- The reporter hook remains prominent, with 5% eligibility and approval conditions explained without implying guaranteed or worldwide payouts.
- Public content is present without operating the map. Internal links lead to the promised explanation or action.
- Existing report links, legacy map links, sign-in/reporting returns, map Back behavior and privacy/publication boundaries pass targeted tests.
- Desktop and phone layouts remain uncluttered, readable and keyboard accessible. Real evidence is visually distinguished from illustrative marketing imagery.
- No live deployment, production migration or mobile release occurs as part of local preview work.

## Search guidance

Google describes links and useful, accessible content as central to discovery and understanding: https://developers.google.com/search/docs/fundamentals/seo-starter-guide

Google's doorway policy cautions against substantially similar city pages that funnel visitors elsewhere: https://developers.google.com/search/docs/essentials/spam-policies#doorway-abuse

This plan does not claim measured search demand, current Search Console performance, ranking gains, or worldwide operational readiness.


## Local implementation — October 28, 2026

The connected local implementation is now available at `http://127.0.0.1:3000/`. `/home-preview` forwards to the new homepage. Nothing has been deployed or pushed, and this work made no production database or mobile-application changes.

### Shipped locally

- Root homepage and separate `/map`; shared map rendering also preserves the authenticated `/report` flow. Recognized legacy root map URLs preserve their query state when forwarded.
- Dedicated reporting and funding guides, expanded cleaner guide, communities directory, a source-backed Boone-area hub at `/locations/us-nc-boone`, and a paginated completed-cleanup archive.
- The existing `PublicSiteHeader` is reused without a redesigned header layout. The centered logo now opens the homepage, Map opens `/map`, and public pages reuse the existing footer markup/styles and site color/type tokens. A secondary navigation connects the new guides.
- Homepage and guide cards use anonymous public report access and recheck visibility. Real completed records supply before-and-after evidence. Current records happen to be concentrated in the launch community; no artificial worldwide activity was added.
- Country-aware community identity supports expansion. Boone labels are verified against the Census 28607 postal-area geometry, not guessed from titles. Precise coordinates remain server-side in the new discovery models.
- Location search accepts international locations. Tested Paris, France, and confirmed the map/list shows no matching opportunities there instead of substituting distant reports.
- Public explanatory content, report links, page titles/descriptions/canonicals and sitemap entries are rendered by the server. Map and filter combinations remain outside the sitemap. Existing non-production noindex headers protect the local review version.

### Verification

- Complete web test suite: **80 files, 440 tests passed**.
- Production compilation and TypeScript checks passed locally; this was a build only, not publication.
- Scoped ESLint: passed without warnings after cleanup. Web boundary check passed.
- Local HTTP inspection confirmed all new main destinations render, with one primary heading and a canonical. Next.js streams redirects/not-found states in development; the browser verified the reporting redirect to `/sign-in?next=%2Freport`.
- Browser checks covered homepage → international search → empty map/list → homepage → reporting guide → sign-in; shared desktop header; phone funding/community/archive/report pages; real before/after images; no horizontal page overflow on checked phone layouts. Report-to-map navigation now waits for the map to be ready before centering the selected report and does not inherit an unrelated saved city boundary; a regression test reproduced the original race and passes after the fix.

### Publication follow-up, outside this local preview

Before any authorized launch, verify the production canonical origin and live indexability, inspect representative URLs in Search Console, and establish a baseline. No analytics integration was found in the existing web source, so this change does not claim to measure organic conversions. Choose the existing or approved analytics/consent approach before adding first-valid-report, successful-contribution, and approved-cleanup events; avoid counting button clicks as those outcomes. No ranking improvement or worldwide payout availability is claimed.

Preview screenshots: `connected-homepage-desktop.jpg` and `connected-homepage-mobile.jpg` in `/Users/grantgibson/.codex/visualizations/2026/10/26/01a179e1-e9d2-75e2-b9b6-36f1c4a7cd68/homepage-mockup/`. The local homepage was left open for review.


### Follow-up implementation

The later local readiness fixes and analytics preparation are recorded in `docs/reviews/2026-10-28-local-seo-implementation.md` and `docs/plans/2026-10-28-website-analytics.md`. These supersede the earlier statement that analytics had not been implemented: both GA4 and PostHog code are now prepared, disabled locally, and awaiting the correct external property/project setup. Final verification: 476 tests, production build, TypeScript and web boundaries pass. No publication occurred.
