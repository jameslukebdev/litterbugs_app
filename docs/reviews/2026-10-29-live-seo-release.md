# Website SEO release — October 29, 2026

Owner authorized live website publication after a minimal location-page cleanup.

## Published
- Homepage, approved public navigation, SEO guides, report pages and public listing presentation.
- Location directory now says “Find litter cleanups near you”; navigation/footer says “Find nearby.” Removed the first-community story and lengthy missing-community copy. Search supports places outside the listed guides.
- Existing Boone route now says “Litter reports and cleanups near Boone,” uses real report/completion feeds and retains accurate 28607 coverage information and local resource links.
- Routes retained; no migration, mobile release, Stripe configuration, or payment transaction performed.

## Release isolation
Built from HEAD 12a88a8 in /tmp/litterbugs-website-release-20261029 with reviewed public website overlays. Shared dirty checkout was not deployed wholesale. MapExperience remains HEAD implementation, exposed at /map; new home handles legacy map query URLs. Account/payment/mobile edits excluded. Global styles selectively retain navigation, search and public-card styles while preserving baseline map/account layouts. Unused reporter earnings components excluded after staged build exposed their dependency on separate payment schema changes. The shared working checkout remains untouched by release exclusions.

## Verification
- 46 focused navigation, analytics, location, legacy-routing, archive and latest-cleanup tests passed in working source.
- Isolated Vercel production build and TypeScript passed.
- 14 staged and 14 live routes returned 200; live pages use litterbugs.app canonicals and have no staging noindex HTTP header.
- Browser verified directory → Boone report listings and completed cleanups; homepage header search produces suggestions while typing and opens the selected area on /map.
- No report was submitted and no payment was attempted.

## Deployment
Deployment: dpl_DJWHVch5nZ6eytbtcteE2k55bEPe
URL: https://litterbugs-jfi6g5vz7-grant-9890s-projects.vercel.app
Live: https://litterbugs.app
Prior production/rollback: dpl_GBp2mCTDK13rf46paLqMFtPMxQby
Build was staged before promotion. Evidence and file hashes: 2026-10-29-live-seo-release/.

## Remaining follow-up
Google Analytics/PostHog integration is in code but production analytics variables were not configured, so tracking remains off. Provider event receipt has not been verified. Larger location/community redesign is intentionally deferred. No production environment secrets changed.

## Follow-up performance release, same day
Owner requested bell-only navigation and faster homepage images, with live deployment.
- Removed visible Updates text while preserving notification accessible name and unread count.
- All four hero photos request immediately; action photos now use responsive Next image variants.
- Public cards request bounded 640px JPEG variants; larger evidence/social images retain 1080px default.
- Photo delivery checks report visibility on every request without profile/description queries. Before-photo path now needs one report query rather than unrelated cleanup lookups. No cache policy weakening: private, no-store retained.
- 34 focused tests passed, including withdrawn/inaccessible photos, unfinished evidence, bounded widths and notification behavior. Production build/TypeScript passed.
- Representative thumbnail: 301,728 bytes before, 84,583 bytes after (72% reduction). One request took 2.31s before and 1.55s after; not a controlled performance benchmark.
- Live signed-in browser confirms bell has no visible label, all hero/action images loaded and no horizontal overflow at 1427px.
- Baseline map header adapter now passes /map and the existing report action into the new shared header's correct slots, avoiding duplicate reporting controls.
Current deployment: dpl_6N2gMoSgNFwzDxEhsDnwvGgn2kAy
URL: https://litterbugs-fglrml12k-grant-9890s-projects.vercel.app
Rollback for this update: dpl_DJWHVch5nZ6eytbtcteE2k55bEPe

## Report/map/heart follow-up — same day
Production was subsequently updated to dpl_HkNzy292wTLMh9imQkQzoeMZ2WB3 for the Report navigation, app-style floating map action, and transparent favorite hearts only. Communities remains local. See 2026-10-29-report-map-heart-release.md for scope, provenance and validation.
