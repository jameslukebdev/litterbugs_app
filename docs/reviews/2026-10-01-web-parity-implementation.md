# Web and app parity implementation

Owner request: implement the October 1 parity and indexing audit. The owner also explicitly requested unfinished report and cleanup drafts, including photos, sync between devices. Branch: `codex/web-app-parity`.

This is a source and verification checkpoint, not a production release claim. The two additive production migrations and the contribution-quote, account-deletion and maintenance functions were deployed on October 1. Website promotion and a compatible mobile binary are still pending. Production pricing remains v1; no store publication has occurred.

| Area | Implementation and evidence | Remaining release check |
| --- | --- | --- |
| Pricing | Authenticated server quote of active pricing; both clients negotiate version, retain existing reservations and amounts. Edge regression tests cover v1/v2 and configuration changes. | Deploy quote handler before compatible clients; verify production quote read-only. Production pricing remains v1. |
| Cleanup submission | Stable submission IDs, response-loss reconciliation, bounded concurrent uploads, durable prepared-photo checkpoints, progress, bounded foreground review. | Preview signed-in cleanup flow and cross-device recovery acceptance. |
| Corrections/review | Cleaner feedback, reasons, note, deadline; structured reviewer reasons and local review draft; fresh pending state. | Preview acceptance with correction fixture. |
| Completed rewards | Web and native use frozen historical reward after remaining pool reaches zero. | Deployed completed-report rendering. |
| Freshness/inbox | Foreground/reconnect/pending refresh; account inbox and shared read state. Isolated browser marked four notifications read and shared database unread count became zero. | Deployed authenticated regression. |
| Preferences | Owner-scoped favorites/hidden reports, insert-only local migration, idempotent operation ledger, tombstones, offline outbox, native hidden filter. SQL isolation/deletion/retry checks passed. | Deploy migration; cross-client acceptance on release candidate. |
| Map stability | Web pins now reconcile by report ID and remain attached across refresh/reorder; changed artwork updates in place. Native cluster/report entrance fades removed, retaining established iOS snapshot behavior. Component regression passed. | Deployed map interaction and native binary check. |
| Navigation | Account routes/sidebar, durable report links, browser history, map/filter/sort/scroll memory, lifecycle visibility. | Allowed-host map and Back/Forward regression. |
| Authentication | Safe return destinations and configured provider linking. Synthetic existing-account login returned to requested report history. | Existing configured provider smoke; excluded Apple/Facebook access constraints still apply. |
| Drafts | Private account drafts/photos; revision conflicts; stable submission handoff; local recovery; 30-day account expiry; orphan photo cleanup; account deletion cleanup. Both clients wired. Shared tests and full isolated SQL/RLS tests passed. Separate browsers restored the same photo and fields, synced edits and resolved a conflict. Native adapter integration restored browser format/photo bytes, synced an edit and discarded the draft. | Actual native binary and deployed backend acceptance; live retention worker verification. |
| Uploads | Browser JPEG/PNG/WebP/HEIC preparation, resize and metadata removal, progress, bounded uploads. A 14.6 MB JPEG became 2.8 MB/2400×1800; HEIC became JPEG; all previews and cloud photo paths verified. Strict Mode object-URL lifetime fixed and regression-tested. | Deployed upload processor acceptance. |
| SEO/install | Meaningful legacy routes, robots, dynamic eligible sitemap, canonicals, real report anchors, private/preview noindex, manifest. | Deploy, crawl, submit sitemap in Search Console. Google indexing remains asynchronous and is not guaranteed. |

Verification checkpoint:

- Final unit regression: 465 mobile, 213 web and 29 shared tests passed. One native integration test is conditional and skipped in the default run; its explicit isolated run passed separately.
- Native cloud-draft adapter integration passed against the loopback fixture with real PostgreSQL/Storage metadata RLS and Node filesystem/crypto shims. This is not a physical iPhone claim.
- Final web/shared typechecks, web lint, Next production build and web boundary check (597 files) passed.
- Final source check: 167 native modules passed. Both iOS and Android Hermes exports passed. An initial all-platform Expo export included unsupported native Stripe web code; the intended native-platform exports succeeded. The customer website uses Next, not Expo web.
- 34 edge tests and edge typechecking passed.
- Next production build and iOS Hermes export passed after the cloud integration work. Final release must use the eventual committed source.
- See `docs/evidence/2026-10-01-web-parity/browser-verification.md`, `drafts-isolated-test.sql/.txt`, `preferences-isolated-test.sql/.txt`, `native-draft-integration.txt`, and `draft-photos-320.jpg`.

Still required: finish targeted browser acceptance, final regression checks, deploy migrations/functions, verify and promote the website, record/build the compatible mobile candidate, post-release crawl and sitemap submission. Do not equate source completion or an exported bundle with a shipped release.

Constraints: no public store publication, no production price activation hidden in deployment, no changes to Grant's Apple developer account. Luke's Apple developer access and a separate Facebook login are unavailable. Apple revocation configuration and separate-user Facebook testing remain excluded, not passed.
