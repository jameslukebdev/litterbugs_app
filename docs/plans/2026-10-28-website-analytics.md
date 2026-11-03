# Website measurement setup — local only

Prepared GA4 for traffic/acquisition and PostHog for product usage. Nothing is transmitting from localhost or preview deployments. Do not use identifiers belonging to another business.

## Runtime controls

All are required: `WEBSITE_ANALYTICS_ENABLED=true`, `VERCEL_ENV=production` (or explicit `LITTERBUGS_DEPLOYMENT_ENV=production` on another host), actual browser hostname `litterbugs.app`, a valid `WEBSITE_GA_MEASUREMENT_ID`, `WEBSITE_POSTHOG_KEY`, and US/EU ingestion host. `.env.example` documents these without actual credentials. Identifiers are public SDK identifiers, not personal API keys.

Both providers load only after explicit analytics consent and remain off for DNT/GPC. Decline leaves site features available. Footer/privacy controls allow changing the choice; revocation disables capture, removes GA cookies, and reloads to remove loaded SDKs. Cross-tab revocation stops capture too.

No account identification, replay, autocapture, surveys, feature flags, automatic exception capture, Google signals or advertising personalization. PostHog persistence is in-memory. Page paths are explicitly allowed and report IDs collapse to `/reports/detail`. Private/auth/payment/account paths are excluded from pageviews. Referrers retain origin only; query strings, hashes, report titles/content/photos/coordinates, emails, account IDs, contribution IDs and amounts are not sent in application event properties. Network providers can still process network information when users opt in.

## Events and interpretation

| Event | Trigger | Limits |
|---|---|---|
| GA `page_view` / PostHog `$pageview` | Consented public route view | Manual once per route transition; no query-string measurement |
| `report_published` | Confirmed publication/recovery result in report flow | No click/edit event; browser-local deduplication by report ID; IDs not sent |
| `contribution_confirmed` | Server receipt status `succeeded` after a consented checkout attempt in this browser within 24 hours | Stripe form success alone never counts; old receipt views do not count; local deduplication; no monetary data sent |

These are consented browser observations, not a complete ledger. Blocked scripts, absent consent, late SDK loading, storage clearing or use of another device can change coverage. PostHog identities reset on a full reload because persistence is in memory. No claim of authoritative unique-user or payment totals. Authoritative approved-cleanup and automatic-approval counts require a separate server-side measurement path/export from confirmed records; this local frontend does not invent those conversions.

## External setup still needed before enabling

1. Google Analytics is configured in separate Litterbugs account 413902651, property 561329300 (Litterbugs Website), web stream 16225434723. Measurement ID G-67YFFS6D5F is saved locally. Enhanced measurement is verified off; optional account data sharing was disabled. Review retention and the privacy disclosure/date before release.
2. PostHog organization Litterbugs, project 695338 (Litterbugs Website), is connected and onboarding is complete on the free plan. The public SDK token and US ingestion host are saved locally. IP anonymization is on; replay, autocapture, console/performance capture, web vitals, exceptions, heatmaps and surveys are off. No external data sources or teammates were added.
3. WEBSITE_ANALYTICS_ENABLED remains false. Neither provider has verified event delivery from this website. PostHog's onboarding checklist completion does not prove ingestion: its project reports ingested_event=false. Do not enable or relax local guards simply to clear an installation prompt.
4. Configure `report_published` and `contribution_confirmed` as the desired GA key events and PostHog funnels, explicitly labeled as consented browser events. Use financial/backend records for actual money and approved cleanup totals.
5. Test consent, decline, revocation, navigation, successful report and confirmed test-mode payment delivery with dedicated test identifiers and an isolated test environment before an authorized live launch. Do not relax the localhost/preview guard or submit live test reports/payments to do this.
6. Search Console `sc-domain:litterbugs.app` access was verified as siteOwner. No sitemap submission or inspection request was made. Establish an organic baseline, then inspect representative public URLs only after authorized publication.

Official references used: https://posthog.com/docs/libraries/js/config ; https://developers.google.com/tag-platform/security/guides/consent ; https://developers.google.com/analytics/devguides/collection/ga4/views .
