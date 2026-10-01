# Website compatibility implementation — October 1, 2026

Implements the [UX follow-up](2026-10-01-web-ux-compatibility-followup.md). TestFlight 2.0.0 build 15 remains the source of truth. This branch changes the website only: no native source, shared wire contract, backend migration, pricing change, app build or TestFlight submission.

## Delivered behavior

| Requirement | Implementation and verification |
| --- | --- |
| Account and historical reports | One navigation per activity action; authenticated historical route checks owner/cleaner/contributor participation under RLS; active records open map detail with an account return destination. Server route tests cover guest, owner, participant, unrelated account and request failure. |
| Native lifecycle | Claimed, awaiting-review and changes-requested cleanups remain actionable beyond original discovery expiry. Explicit cancellation/expiration remains closed. Completed work is shown as completed. |
| Stable navigation and focus | Account activity uses real route links, with current/history/reports in URL state. Report dialog opening focus is independent of refresh callback identity. Nested share Escape preserves the underlying report and restores Share focus, verified in browser. |
| Responsive report reading | Phone DOM order starts with title/status (completed work starts with the cleanup story), followed by evidence and facts. Tablet and 320px no-photo layouts reflow without the old fixed-width clipping. Desktop compact detail retains map/list context; larger view has a scrolling story and sticky original photo. |
| Account hierarchy | Profile, My activity, Payments & payouts, Notifications, Settings; mobile select, clear page headings, useful empty-state actions, visible Report litter entry. Contributions link to receipts. |
| Discovery | One search action with town/address choice under Search options; dedicated filter dialog, applied-count label, explicit area label. URL stores filters, sort, rounded map center/zoom and selected place ID. Matching session memory retains scroll and loaded batches regardless of object key order. Location denial offers city search. |
| Draft continuity | Profile/activity resume summaries for report and active cleanup drafts; title/location or notes, photo count, save timestamp. Conflict view compares account and device metadata and explains whole-version replacement. Guidance follows existing native Profile → My activity continuation, without inventing a native draft URL. Existing shared sync implementation is retained. |
| Report/evidence entry | Authenticated `/report` task URL; desktop step list, early fresh-location/50-mile guidance, drag/drop, gallery and coarse-pointer camera input. Profile images use the same preparation pipeline. Evidence/review workspaces use one scroll surface and desktop before/after columns. |
| Identity and freshness | Apple-only customers are directed to link a supported provider inside their existing app account. No automatic email-account merge is promised. Inbox labels unread updates; offline banner explains network-required actions. |
| Performance | 1,000 result fixture renders 50 cards initially, 100 after Show more, while all 1,000 matches remain available to the map. One refresh clock per cadence replaces one interval per subscriber; 100-subscriber test verifies one timer. Existing stable marker identities retained. This is bounded component verification, not a production 1,000-pin benchmark. |
| Installation and public profiles | Native artwork produces 192px/512px/maskable install icons. Browser parses manifest with zero errors. Public member route uses an explicit public-field allowlist and noindex, with existing member safety controls. |

## Verification

- Web suite: 235 tests across 49 files passed on final application source.
- TypeScript, ESLint, production build and whitespace validation passed during implementation.
- Browser checks: 1280px compact/expanded report; long completed story can scroll to original facts/author; nested share Escape/focus; 390px report and filters; 768px and 320px no-photo reflow; photo selection/focus preserved across background refresh; public member route.
- Local map-provider restrictions are treated explicitly: production-mode local test lacked Maps env, development host key was restricted. Hosted map validation is required before promotion. Provider pin failures now preserve the report browser and show a recoverable message.
- Search Console previously verified sitemap Success / 17 discovered URLs on October 1. Aggregate 14 indexed / 7 excluded was dated September 20; redirects, private destinations and malformed URLs are not all candidates for indexing. No new sitemap resubmission in this pass.

## Limits and deliberate boundaries

Physical iPhone/Android camera, actual home-screen installation, Safari/Firefox, screen-reader and end-to-end phone/computer acceptance were not newly performed. Browser manifest diagnostics are not an installation claim. Live claims, legal waivers, real payments and destructive account actions were not exercised. Existing isolated sync/payment tests do not substitute for those device journeys. Automatic Apple grant revocation remains unconfigured and separate-user Facebook remains unverified, as excluded by the owner; neither is reopened as a release gate.

Native push versus web inbox remains platform-specific. Browser push and a full offline service worker are optional future features. No claim is made that submitting, claiming or paying works offline or that all eligible URLs are already indexed.

## Release

Website production deployment `dpl_4rnMkNwoqx72RoYMyh7BwwQyDsiR`, source `1ee0f59162bb288f4a3bd9ec316c7cf3d59cf5f2`, built October 1 at 17:30 EDT and promoted after staged checks. URL: https://litterbugs-4i0rmiypt-grant-9890s-projects.vercel.app. Live domain verified to resolve to this Ready deployment. PR: https://github.com/jameslukebdev/litterbugs_app/pull/102.

The temporary domain is intentionally not authorized by the production Maps key (`RefererNotAllowedMapError`). No key restrictions were changed. Production Boone search returned four reports, visible town boundary, map tiles and four pins. Pin DOM identities remained `[80,84,88,92]` across zoom and subsequent refresh. Production report photo 2 and Next photo focus were retained across background refresh. Authenticated closed report opened its history destination and Back returned to My reports. The 390px account menu, report task entry and offline banner were also verified without creating customer records. A cancelled-history expiry label found during this check was corrected and regression-tested in the follow-up release. Authenticated Cleanup history selection survived a full reload at `/account/activity?view=history`. Staged completed filters persisted after reload. Production manifest parsed with no errors and Chrome returned `installabilityErrors: []`; actual installation was not performed. Initial deployment error-log query returned no matching logs; that is a bounded observation, not proof of zero possible errors.

Rollback target: prior Ready release `dpl_GTbe12DSwyMkvA7aDhKwLyYN2162` / `litterbugs-q6k2af3k6-grant-9890s-projects.vercel.app`. No new TestFlight build/submission.


Final follow-up deployment: `dpl_EqiHLNBaKFKRuEmUvQpBhTaB6pPw`, application source `0e53c29b2222ffa71f6b2686c9080f6771108147`, URL https://litterbugs-eo7zd7umb-grant-9890s-projects.vercel.app. Hosted build completed in 9 seconds (37 seconds total deployment), TypeScript passed, and the production domain was promoted successfully. Live authenticated verification confirmed the closed report retains “Report closed” and no longer displays an upcoming expiry. Final application checks: **235 tests / 49 files**, ESLint, production build and whitespace validation passed. Native/backend/shared-contract tracked diff remains empty. The following documentation commit records evidence only and does not change the deployed application.

Release screenshots: `docs/evidence/2026-10-01-web-ux-release/live-discovery.png` and `live-desktop-report.png`. Browser emulation used for offline/reduced-motion checks was reset; temporary local servers were stopped. Device acceptance limits above remain explicit. No new installation, customer report, claim, waiver, payment or account mutation was performed during browser verification.
