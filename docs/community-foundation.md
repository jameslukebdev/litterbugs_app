# Community directory foundation

This foundation was implemented locally on October 30, 2026. It has not been deployed by this change.

## Editorial ownership

The directory is manually maintained. No organization accounts, submission queue, email subscriptions, pooled funds, or database schema were added. Resource suggestions use the existing Support page. Existing browser-only organization drafts are no longer exposed; their saved data was not deleted.

`apps/web/lib/community-directory.ts` is the public record for each community: stable ID, canonical path, names, aliases, metadata, map link, geographic description, resource IDs, publication decision, search approval, and actual review date. It contains no report coordinates or boundary polygons. Search, cards, city metadata, report links, organization service-area links, and the sitemap use this record. Unknown searches continue to the map and do not create pages.

`apps/web/lib/public-communities.ts` joins those published records to server-only boundary geometry. Boone uses the sourced 28607 postal boundary, not municipal limits. The city page discloses this scope. Approved completed reports retain their existing URLs and visibility rules.

`apps/web/lib/community-resources.ts` stores organizations and their service-area IDs, resource descriptions, official sources, capabilities, participation requirements, and previous review dates. `resourcesForCommunity` resolves the IDs in the community record. Do not change review dates merely because a page renders or a build runs.

## Adding a community

1. Establish a useful local participation route, reviewed resources, and distinct guidance or cleanup evidence. An empty map is not a reason to generate an indexable city hub.
2. Add its record as a draft, with search approval false. Define an unambiguous canonical path and exact place aliases.
3. Add a documented server-side geographic boundary and local resource relationships. Distinguish nearby reports from reports inside that boundary.
4. Build its city route with the existing community theme and shared report/resource components. Preserve the existing report, contribution, and cleanup flows.
5. Review geography, official-source claims, empty/outage states, privacy, metadata, and desktop/mobile navigation. Publish the record only when useful. Approve indexing separately after review; sitemap inclusion requires published + searchApproved + reviewedAt. Current organization profiles retain noindex.
6. Run the community registry, geography, bookmark, public-report and metadata tests, lint, TypeScript, and rendered browser checks. Deployment is a separate action requiring owner authorization.

## Saves

Save community is a local bookmark. The directory displays saved published communities. It has no email, account sync, contact collection, or analytics conversion side effects. Legacy Follow bookmarks are still read; removing a bookmark clears both old and new keys. Source records are public; bookmarks remain in the visitor's browser.

## Intentionally deferred

Organization self-service and claims, team permissions, support requests, digest delivery, attribution dashboards, and additional city launches. Existing reporting/contribution analytics were left unchanged to avoid mixing bookmarks or outbound referrals with confirmed participation.

## Community participation paths (local, October 30)

`lib/community-journey.ts` builds recognized community report entries, selected-report map actions, and safe return paths. Report entry keeps the slug, area, and canonical community return through sign-in. It restores the geographic picker, never an exact litter location. A visitor must still choose and confirm the report pin.

Boone has one available-report preview, a full paginated collection, a funding filter on that collection, and separate completed results. The featured before-and-after result is excluded from the cards beneath it. Community report stories link to the existing web funding/cleanup controls. The intent only focuses those controls; it does not start payment, accept a waiver, or claim a cleanup.

Only published canonical community URLs are accepted as community return destinations. Stripe return URLs keep receipt/report IDs and that validated destination. An expired session preserves those identifiers through sign-in; receipt actions can reopen the community report or return to its hub. Ordinary account receipt destinations remain unchanged. Feature flags, authorization, fees, claiming, and payment processing still belong to the existing flows.

Community action spacing lives in `components/communities/community-journey.module.css`. No global style, header, homepage, or existing community color/type stylesheet was changed in this pass.

## Local foundation completion — October 30, 2026

The owner's final direction is to keep community pages specific and remove repeated homepage information. `/communities` now contains the place finder and community directory. General participation explanations, organization pitches, FAQs, and global cleanup networks were removed from that page. Boone contains four local sections: available reports (with a funding-filter destination), local help, completed work, and sourced local guidance. General platform-support pitches, the generic neighborhood-cleanup explanation, and the general-map “nearby” block were removed. The shared homepage, header, global styles, community theme, and map clustering were not edited.

Completed evidence uses the existing public share models and existing report URLs. The community result component shows completion dates, public cleaner/reporter attribution, and recorded quantities. Weight is labeled cleaner-reported, missing fields are not turned into zeros, and invalid/negative values are omitted. Before-and-after evidence is featured once; other results have after photos where available, with an explicitly labeled before-photo fallback. Active reports never become completed evidence. Community dates use UTC consistently. Results are not a separate story system or a new claim of independently weighed impact. Completed lists retain the existing report-created ordering; no “latest completion” ordering or all-time impact totals are claimed.

### Measurement contract

The existing consented Google Analytics/PostHog integration now recognizes community entry context. It remains off on local and preview hosts and respects Do Not Track/Global Privacy Control. `lib/community-metrics.ts` permits only published community IDs, finite participation actions, and reviewed resource IDs. No report IDs, receipt IDs, account IDs, descriptions, precise coordinates, amounts, search strings, or outbound URLs are sent as event properties.

- `community_opened`: a link selecting a community; this is a navigation click, not proof the destination loaded.
- `community_report_opened`: a local report link clicked; pair with the existing report-detail page view when interpreting a funnel.
- `community_action_started`: a report/fund/clean entry link clicked, never a completed action.
- `community_resource_opened`: a link to the exact reviewed official resource clicked; assistance is not confirmed.
- `community_saved` / `community_unsaved`: browser bookmark actions, separate from participation outcomes.
- `report_published`: existing backend-confirmed publication, now with a recognized community entry context when available.
- `contribution_confirmed`: existing confirmed successful receipt, only following a recent consented payment attempt. The attempt's community survives a redirect; old receipts do not become new conversions.
- `cleanup_approved`: emitted only after the existing protected review RPC returns completed, never for an unchanged response, change request, or failure. It measures an observed confirmation in that browser, not every service/admin/automatic approval.

For outcomes, `community_id` identifies the entry context, not an independently verified report location or the participant's residence. Missing context stays unattributed. No cross-device attribution or new backend tracking table was added. Local deduplication IDs and short-lived payment-attempt context remain on the device. These observations are a consented subset, not an accounting ledger or a complete activity total. Provider receipt is not verified by local mocks; no live synthetic events were sent and production variables were not changed.

### Repeatable checks and release status

From `apps/web`, run `node scripts/check-community-foundation.mjs` against the running local server. It makes read-only HTTP requests and checks initial HTML, canonical URLs, indexability, community-specific content, geographic disclosure, resource profiles, local evidence links, pagination, permanent legacy redirects, sitemap inclusion/exclusion, and unknown-place 404s. An optional first argument selects the base URL; a second selects the expected canonical origin. Local defaults expect the existing development origin `http://localhost:3000`. Production requires `https://litterbugs.app`, enforced by `lib/site-url.ts` and its tests. Do not change a shared server's environment merely to make an audit pass.

The final pass recorded 218 tests passing in 27 focused files, TypeScript and scoped lint passing, and 64 HTTP contract checks passing. Desktop and phone checks covered evidence, images, no horizontal overflow, directory search, and completed report → available Boone opportunities. Test receipts and approvals were mocked; no reports, claims, payments, or actual approvals were submitted.

Read-only Google URL Inspection on October 30 found `/communities` and the Boone hub unknown to Google, while the representative Greenwood Lot report was submitted and indexed with its expected canonical. This is a bounded indexed-snapshot baseline, not a live crawl or sitewide conclusion. The deployed Boone page's page audit found no reported technical issues. No indexing request, sitemap submission, deployment, or production configuration change was made. Reinspection and provider receipt verification belong after a separately authorized release.

This completes the local implementation and verification of the agreed pilot foundation. Organization accounts/submissions, email updates, dashboards, additional cities, and deployment remain outside this scope. For the next community, follow the editorial/geography/content/publication gates above and reuse the evidence, participation, measurement, and contract-check patterns.
