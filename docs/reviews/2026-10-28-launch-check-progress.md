# Local launch checks — progress

No deployment or production data write was performed. Analytics remains disabled locally.

## Passed in this run

- 489 website tests across 86 files, including report publication/recovery, payment return/detail and analytics consent/privacy boundaries.
- 41 backend tests, including contribution retry/idempotency, webhook identity/amount checks and reporter payout handling. These are isolated tests, not current Stripe sandbox transactions.
- Website boundary check: 882 source/build files checked.
- Backend function type checks passed.

Logs are saved in `2026-10-28-seo-evidence/launch-checks/`.

## External setup not completed

- PostHog connector returns reauthentication required. Asked owner to reconnect. No project created or changed.
- Google Analytics browser session currently shows Inverlin Woodshop. Asked owner whether to use the same Google login with a separate Litterbugs Analytics account or a different login. No existing business property changed.
- Stripe connector identifies Review Hiker (`acct_1RkuHFKaOxvpERuR`), not Litterbugs. Asked owner to connect Litterbugs sandbox. Do not use this connector for Litterbugs test payments until the account is corrected.

## End-to-end limitations and next work

The website `.env.local` points at a remote Supabase backend and contains no Stripe test-mode configuration. Localhost alone does not isolate data writes. Colima was initially stopped; starting it revealed only another project's existing containers. They were not used or modified, and Colima was stopped again to restore the initial runtime state.

The hosted account E2E suite defaults to the live website and creates/deletes reports when QA credentials are provided. It was not run. Before running equivalent flows, prepare a separate Litterbugs local backend from baseline/migrations, use disposable local users/photos, configure the verified Litterbugs Stripe sandbox and local webhook handling, and point a separate local web process at that backend. Keep the normal preview on port 3000 unchanged. Validate publish/retry, claim/evidence/approval/dispute, checkout success/decline/cancel, receipt recovery and duplicate webhooks there.

Provider event delivery, real-device checks and production release configuration remain unverified. Passing isolated automated tests does not certify those items. Preserve owner exclusions for Apple revocation and separate-user Facebook testing.

## Account setup follow-up

Owner confirmed using the same Google login with a separate Litterbugs Analytics account. Prepared the Google wizard: account `Litterbugs`, property `Litterbugs Website`, New York timezone, USD, Online Communities category, small business, traffic and engagement objectives. Optional account data sharing disabled. Wizard is at Terms of Service/Data Processing Terms; acceptance and actual account/property creation remain pending. No measurement ID exists yet.

PostHog reconnection was retried and still returns UNAUTHORIZED/reauthentication required. Stripe connector remains Review Hiker; opened Stripe dashboard to perform requested switching but browser is signed out. Owner sign-in requested; no Stripe settings changed.

## Verified account creation and sandbox access

Google Analytics account 413902651 (Litterbugs), property 561329300 (Litterbugs Website), stream 16225434723 for https://litterbugs.app created after owner accepted terms. Measurement ID G-67YFFS6D5F saved to apps/web/.env.local with WEBSITE_ANALYTICS_ENABLED=false. Enhanced measurement was disabled and verified as off on stream details. No website tag deployment or events sent. Key-event setup and provider delivery verification remain outstanding.

Stripe browser now verified in Litterbugs sandbox acct_1U2HaBKUBoEpySr6, explicitly marked Test with sandbox isolation banner. Connector still belongs to Review Hiker, so it must not be used for Litterbugs operations. No new payment or key created; isolated backend/checkout testing remains outstanding.

PostHog connector still UNAUTHORIZED. Browser fallback is signed in as gegibson3113@gmail.com in Retire City Finder, project 440093. Only that organization is listed. Attempted to create a separate Litterbugs organization; PostHog blocked creation on its Re-authenticate for security prompt. Owner requested to complete this prompt. No Litterbugs PostHog organization/project or token has yet been verified or configured. Existing Retire City Finder organization was not renamed or modified.

## PostHog connected and configured

PostHog connector now works. Verified organization Litterbugs (01a18546-7a0a-0000-3471-cddbaaace358), project 695338, renamed from Default project to Litterbugs Website. Screenshot project 695317 is not accessible through this organization; do not configure against that unverified ID. No other project deleted or changed.

Saved public SDK token and https://us.i.posthog.com to apps/web/.env.local, retaining WEBSITE_ANALYTICS_ENABLED=false. Project settings verified: America/New_York timezone, IP anonymization on; autocapture opted out; session replay, console/performance capture, automatic exceptions/web vitals, surveys and heatmaps off. Existing consent-driven manual integration retained. No warehouse integrations or real events sent. Focused analytics tests passed (11 tests). End-to-end provider delivery, GA key-event setup and isolated report/payment tests remain open.

## PostHog onboarding completed

Completed the configure, replay, optional import, free-plan selection and teammate steps for project 695338. No teammates invited, data sources linked or paid plan selected. Verified dashboard reached and API onboarding flags completed. The wizard reset console/performance capture to true; restored both to false and verified the update response. Replay remains false and autocapture opted out. No event was ingested; onboarding checklist labels are not event-delivery evidence. Local analytics remains disabled. GA key events, provider delivery and isolated reporting/payment E2E remain outstanding.
