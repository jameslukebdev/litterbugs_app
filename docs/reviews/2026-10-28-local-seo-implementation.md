# Local SEO fixes and live-site consistency

October 28, 2026. Local code and local preview only. No deployment, push, production database changes, payments, reports, analytics project changes, or Search Console submissions.

## Implemented

- Report litter actions consistently open `/report`; educational navigation says How reporting works.
- Homepage visibly qualifies the earnings offer with approval, 18+, eligible US Stripe payout setup, and no guaranteed payment. Global discovery does not promise global payouts or local activity everywhere.
- Invalid/repeated/out-of-range archive pagination returns Next's not-found/noindex state. Backend unavailability remains distinct. Streamed responses can retain HTTP 200 while injecting noindex.
- Mobile secondary navigation expands instead of hiding links in a horizontal scroll area. Search stacks at narrow widths, and public pages provide skip-to-content links.
- Branded shared social image and page-specific Open Graph/Twitter metadata; production origin validation; homepage Organization/WebSite and community breadcrumb structured data.
- Homepage introduction/search render independently of report-feed loading. Unavailable report photos have an accessible fallback.
- GA4 and PostHog integration, consent controls and local privacy disclosure, route sanitization, manual pageviews, and confirmed outcome hooks. See the analytics setup document for precise coverage and unfinished external setup.

## Compared with the live site

Read https://litterbugs.app/about, /terms, /cleanup-policy, /cleaner, /cleanup-safety, /help, and /privacy on October 28, 2026.

| Subject | New page treatment and live-site agreement |
|---|---|
| Reporter reward | 5% of eligible principal, from service fee, after approved funded cleanup; does not reduce cleaner reward; no guaranteed payment |
| Payout eligibility | 18+ and eligible US Stripe payout account; bank arrival is distinct from transfer; reporter transfer follows cleaner transfer |
| Account eligibility | Permanent account to publish; minimum 13 with guardian permission below local legal majority; distinct from adult reward/claim eligibility |
| Fees | 20% plus $0.50 below $5; $1–$1,000 principal; $10 + $2 example |
| Renewals/refunds | 30-day active periods, seven-day expiry decision window, unused contribution refund at 23 months; original charge including fee refunded under policy |
| Cleanup | Adult safety acknowledgment, legal access, 24 hours to complete and submit evidence, one to three after photos |
| Review | Evidence review before up-to-48-hour approval/dispute window; automatic approval if no response; disputes pause reward; payout checks still apply |
| Participation | Can report and clean same site; neither government notification nor emergency service; no guaranteed work or wages |
| Global positioning | International search, truthful availability and verified Boone-area activity; no claim of worldwide payout support |
| Privacy | Optional consented analytics extends the existing stated reliability/usability analysis purpose; no behavioral advertising, replay, automatic form capture, report content, precise coordinates, or payment details in events |

Clarified the new guides' account eligibility, evidence submission deadline, automatic approval, and shared participation reward wording. Existing published terms and financial rules were not rewritten. The privacy addition is local draft copy for the optional analytics implementation; its effective date must match any eventual release.

## Verification and limits

- Production build and TypeScript pass locally.
- Final complete web suite: **86 files, 476 tests passed**. Web boundary check passed across 879 source/build files.
- Scoped ESLint passes for analytics, metadata/image and structured-data changes. No whitespace errors in the web diff.
- Direct production-mode HTTP checks: seven public routes return 200 with expected canonicals/social titles; malformed/repeated/out-of-range archive URLs emit noindex; sharing image returns image/png and was visually inspected.
- Local browser: mobile guide navigation; actual Report litter action leads to `/sign-in?next=%2Freport`; Analytics choices confirms collection is off locally. Earlier production-mode mobile test at 390px/4x CPU/150ms network latency had no horizontal overflow; this is not field Core Web Vitals certification.
- No signed-in publication, payment, cleanup, or approval was performed against the live-backed preview. Full test-environment journeys, real-device Safari, live metadata/indexability, analytics delivery and Search Console baseline remain release checks. Homepage and community JSON-LD parse correctly; local HTTP checks show no remote analytics scripts and preserve noindex.
- Funded approval mismatch fixed locally at the owner’s request: the funded evidence-review screen now exposes Approve cleanup beside Dispute cleanup, using the existing protected `review_cleanup` RPC. The approval confirmation explains that the dispute window ends and payment checks still apply. No server rules or financial calculations changed. Regression tests cover eligible approval, photo-review/dispute/admin/deadline holds, cancellation, uncertain responses, network failure, duplicate clicks, legacy admin-pending eligibility, and the separate dispute RPC. All 17 review-component tests, scoped lint, TypeScript, and production build pass. Verification used mocked RPC responses and repository SQL contract inspection; no live cleanup/payment was approved and no database migration was applied.

## Shared report page provenance

The standalone `/reports/[id]` format predates this homepage work (tracked in Git before October 2026). On October 28, the exact live report `/reports/dfcbc1d7-b98b-4b8f-b9f2-4499d8d06204` returned HTTP 200 with its title, Shared Litterbugs report label, and original Back to search navigation. Local SEO work added the common website header/footer, guide and community links, and `/map` destinations; it did not introduce the large standalone report layout.

## Clean styling pass

At the owner's request, the homepage, reporting guide, cleaner guide, funding guide, community directory, Boone-area guide, and completed archive now share the simplified report-page treatment: green headings from existing site tokens, unboxed listings and examples, plain status/reward text below report titles, and photo captions below images. Community links and empty states use open sections. Functional search inputs/buttons, focus outlines, and the existing site header/footer remain.

Desktop and phone browser checks covered all seven routes with no horizontal overflow. Shared heading color and footer presence verified on each. Archive photos loaded successfully; guide example and responsive listing layouts inspected visually. Scoped lint, TypeScript and local production build passed. No deployment or live data changes.


## Final navigation, hero and link review

See `2026-10-28-final-local-website-review.md` for research, decisions, verification and remaining launch gates. The local header now uses Map / Reporter rewards / Cleanups, replacing the second navigation strip. The hero contains headline and location search; reward conditions follow below. Generic participation endings were removed from guides and the community hub, retained on the homepage only. Local link crawl covered 68 URLs (46 paths); 488 tests passed, plus production build, typecheck and scoped lint. No deployment or live activity performed.
