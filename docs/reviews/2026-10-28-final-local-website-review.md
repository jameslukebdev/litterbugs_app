# Final local website review — October 28, 2026

Local only: no deployment, remote writes, report publication, cleanup approval or payment.

## Research and decisions

Reference lock: keep Litterbugs’ white canvas, system font, green headings/actions, centered logo, open content and shared footer. Research informs structure, not a replacement brand.

| Decision | Basis |
| --- | --- |
| Headline and location search in the hero; remove marketing buttons/subheading | Owner request; Zillow leads with location search, Taskrabbit with task search. Search retains its accessible icon submit control. |
| Reward conditions immediately below hero | Preserve eligibility and conditional earnings while simplifying the hero. Global discovery does not imply global payout eligibility. |
| Map / Reporter rewards / Cleanups in one header | Owner rejected generic How it works/Explore labels. Direct rewards guide; grouped finding, funding, completed cleanups and communities. GoFundMe demonstrates grouping by visitor intention. |
| One mobile drawer | Same destinations plus About/Support/Safety/Help/Get the app, removing the second navigation bar/control. |
| Remove generic three-role blocks from guides and community hub | They compete with page-specific next steps and repeat navigation. Keep the three-role introduction on the homepage, where it provides orientation. |
| Preserve crawlable links | Server-rendered anchors with hrefs, contextual guide/policy/report links and sitemap remain. Removing repetition does not remove the important destinations. |
| Accessible disclosure | Button state and controlled ordinary link list, Escape dismissal, outside-click dismissal and closing when focus leaves. Existing mobile dialog focus handling retained. |

Sources consulted:
- https://www.zillow.com/ — headline and location search.
- https://www.taskrabbit.com/ — task search and compact top-level navigation.
- https://www.gofundme.com/ — grouped Donate/Fundraise/About links with persistent primary action.
- https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/ — disclosure navigation semantics and keyboard behavior.
- https://developers.google.com/search/docs/crawling-indexing/links-crawlable — real anchors and descriptive link text.

These patterns support the recommendation; this is not evidence of a universally best or conversion-tested arrangement for Litterbugs. Refero returned NO_SUBSCRIPTION; its private library was not available.

## Verified

- Local read-only crawl: **68 URLs / 46 unique paths**, starting with public pages and all sitemap entries and following discovered internal anchors. No HTTP error destinations or missing section-fragment targets. All fetched pages had the local noindex response header. Evidence: `2026-10-28-seo-evidence/final-local-links.json`.
- This covers public website links, current sitemap report pages and signed-out utility entry points, not all private account states. External store/payment links were preserved, not transaction-tested.
- Browser: hero search for London, UK returned a result and opened a loaded London map at the returned coordinates.
- Browser: completed archive → Greenwood Lot public report → View on map opened that selected report, including before/after photos and impact details.
- Browser: /report → /sign-in?next=%2Freport, preserving report creation as the intended action. No sign-in or report publication performed.
- Browser: all six guide/directory/archive pages loaded at effective 355 CSS pixels, with headings/footer and no horizontal overflow. Mobile drawer opened, navigated and closed. Desktop hero/header visually inspected.
- Invalid community/archive inputs render not-found/noindex. Next streaming can return HTTP 200 with that not-found body; this is not proof of a valid-content page.
- Optimized production build, TypeScript check and scoped lint passed.
- Full web suite: **488 tests across 86 files passed**. Component tests use mocked dependencies for transactional operations; they do not establish an end-to-end payment or approval result.

## Still needed before publication

1. **Analytics configuration.** Create/configure Litterbugs GA4, reconnect/configure PostHog, add the intended identifiers and verify consent/event delivery in a controlled production-like environment. Keep localhost/preview tracking off. Disable GA enhanced automatic page-view measurement when using the implemented manual page views. Search Console ownership was previously verified. Details: `../plans/2026-10-28-website-analytics.md`.
2. **Isolated transactional testing.** Test sign-in → photos/location → report publication, claim → completion evidence → approval/dispute, and contribution success/cancel/failure with test accounts and test payments. The preview is live-backed, so this review did not create test activity. Funded-approval component coverage exists, but no isolated backend integration run occurred. Owner-excluded Apple developer/separate Facebook testing remains excluded.
3. **Release-build mobile/accessibility/performance checks.** Check real Safari/Chrome, screen readers, slow feeds/images and loading/layout stability. Development-server screenshots are not field Core Web Vitals or accessibility certification.
4. **Release configuration and scope.** Verify canonical origin https://litterbugs.app, preferred-host/HTTPS redirects, intended public indexability, preview/utility noindex, public image/social-card access and sitemap. Isolate intended website changes from the working tree’s unrelated mobile/backend edits before release.
5. **Outcome measurement.** Approved-cleanup analytics still need authoritative backend events or a verified export. This does not block browsing, but complete SEO-to-cleanup attribution cannot yet be claimed.

After separately authorized publication: inspect representative URLs in Search Console, check/submit sitemap, confirm public indexability, test social previews and monitor organic visits, successful reports, errors and performance. Add location pages as real verified activity supports them; no invented global location rollout or large blog is required.
