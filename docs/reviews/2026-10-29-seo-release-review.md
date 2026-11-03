# Local SEO-page release review — October 29, 2026

## Scope

Owner narrowed this work to the new public/SEO pages. Reporting, payment, cleanup approval and Stripe integration testing are explicitly outside this thread's completion gates. No deployment, reports, payments or remote data changes were made. Existing map behavior and mobile app code were not changed by this pass.

## Changes in this pass

- Public-page navigation: outlined **Open map** link with a map icon; compact label **Map** on smaller screens; first drawer destination remains Open map. Smallest phones use the drawer to avoid crowding account/search/menu controls.
- Report litter dropdown: **Start a report** → /report; **Reporter reward details** → /report-litter. Desktop and mobile. Existing Support destinations retained. Custom map report action and map-context navigation preserved.
- Added /get-app to the analytics route allowlist; it previously received no page-view events. Local analytics remains disabled.
- Added a test covering navigation through all new SEO routes with exactly one page view per visit in both provider adapters. No real conversion events sent.

## Verified locally

- Separate optimized production build and TypeScript passed. Built in a temporary copy to leave the port-3000 development preview untouched. Existing HEIC-library dynamic-require warnings remain; no build failure. Initial temporary-copy dependency linking failed typechecking, corrected by including both root and web workspace dependencies; successful rerun is the reported build.
- 46 focused navigation, analytics privacy, metadata, canonical-origin and archive tests passed; then all 8 analytics component tests passed including the new route-navigation check (47 distinct tests across those files).
- 40 local destinations fetched with no HTTP failures. Twelve public pages each have one H1, a description, canonical and sharing image. Evidence: seo-release-evidence/links.json.
- SEO audit tool checked homepage and 11 public routes. Expected localhost/127.0.0.1 canonical difference is local-only. Cleanup archive's streamed canonical warning was checked against bundled Next.js metadata documentation; Twitterbot response contains the canonical in head. No global metadata-streaming change made.
- Sitemap, robots and generated Open Graph image returned 200. Local pages retain noindex,nofollow.
- Automated axe WCAG 2 A/AA and 2.1 AA checks: no violations on homepage and 11 public routes at effective 375px. This is not manual screen-reader or real-device Safari certification. Evidence: seo-release-evidence/accessibility.json (11 route entries; homepage checked separately).
- Header tested at effective 320, 375, 600, 768, 1024, 1240 and 1309px: no horizontal overflow. Desktop dropdown, mobile dropdown and reward link exercised. Screenshot: /tmp/litterbugs-seo-navigation.png.
- Type-ahead search returned area suggestions and selected Boone, NC into /map?view=map&browse=1&area=4%3A3707080&lat=36.2194&lng=-81.64255&zoom=12. This verifies public-page search handoff, not map functionality.
- Local production homepage observation: LCP 584ms; CLS approximately 0.00072; zero Google Analytics/PostHog resource requests. Unthrottled local observation only, not field Core Web Vitals. Browser tool did not support network-throttling command, so no simulated slow-network certification is claimed.

## Local environment limitation

Both current local .env.local and its release-copy snapshot lack NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY and NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID. Map destination displays its configuration fallback. This pass did not change map configuration or source. Production settings cannot be inferred from local absence.

## Publication-only checks

These require the eventual authorized release and are not unfinished transactional work:
- Verify deployment uses NEXT_PUBLIC_SITE_URL=https://litterbugs.app, correct production environment marker and intended analytics identifiers/enablement. Existing URL validation guard is tested.
- Verify preferred-domain/HTTPS behavior, intended public indexing, canonical/sitemap/social URLs on the actual host.
- Confirm consented page views arrive in GA4 and PostHog; local adapter tests are not provider receipt evidence. Keep previews off; do not loosen production-host restrictions to manufacture receipt evidence.
- Inspect/submit representative URLs and sitemap in Search Console after publication, not before.
- Real-device Safari and production performance observations remain distinct from Chromium/mobile viewport checks.

## Release scope

The checkout contains extensive concurrent mobile, map, account, backend and payment changes. Do not publish the entire dirty working tree as an SEO release. Prepare an explicitly reviewed release diff with the owner/other thread before publication. Shared header and analytics files contain earlier work too; file-level inclusion alone is insufficient. This pass did not stage, commit, reset or deploy those files.
