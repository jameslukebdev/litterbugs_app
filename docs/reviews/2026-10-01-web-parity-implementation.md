# October 1 customer web/app parity release

The owner requested implementation of the [parity/indexing audit](2026-10-01-web-app-parity-and-indexing-audit.md), including unfinished drafts/photos across devices, then added map flashing to the scope.

## Shipped website and backend

- Live website: https://litterbugs.app. Final production deployment `dpl_GTbe12DSwyMkvA7aDhKwLyYN2162`, source `3cbd37f1c8ea0959fbb3bb7b5845f12f70d98484`; production environment was built before promotion. Earlier same-day candidate `dpl_GBQSmDyV1bpAn2tqPoMdTHQNzZji` is superseded.
- Production migrations: `20261001181506_sync_report_preferences`, `20261001183641_sync_customer_drafts`, `20261001194157_cancel_pending_customer_drafts`.
- Edge functions: contribution quote, account deletion and financial maintenance deployed. Account deletion explicitly validates the bearer token using live `auth.getUser`; CORS preflight passed, absent/invalid tokens returned 401. No account was deleted for this check.
- Production pricing remains **version 1**. No pricing activation or public store submission occurred.
- PR: https://github.com/jameslukebdev/litterbugs_app/pull/101.

| Customer area | Result and verification |
| --- | --- |
| Account/navigation | Dedicated account routes/sidebar, safe sign-in return, report links and Back/Forward, map/filter/sort/scroll memory. Synthetic sign-in preserved `/account/reports`; live map selection and Back verified. |
| Freshness/inbox | Foreground/reconnect/periodic refresh, faster pending updates, shared notification read state. Isolated browser marked four notifications read; shared database unread count became zero. |
| Preferences | Account favorites/hidden reports, idempotent retries, tombstones and offline outbox. SQL owner isolation, retry, legacy import and deletion tests passed. |
| Drafts/photos | Private account drafts and photos, local recovery, explicit conflict choices, stable submission identity, 30-day account retention. Separate browser contexts restored the same fields/photo, synced edits and resolved a conflict. Native adapter restored browser-format photo bytes, synced an edit and discarded the draft. |
| Failed submission recovery | Explicit discard fences late report/cleanup commits using a server cancellation record. Already committed reports remain published. Isolated tests cover cancellation before commit, commit before cancellation, new draft identity, expiry and late requests. Web test requires successful server cancellation before closing or clearing the publication journal. |
| Cleanup | Bounded uploads, prepared-photo checkpoints, response-loss reconciliation, correction reasons/note/evidence/deadline, structured review reasons and review draft retention. Targeted submission and review tests passed. |
| Payments/rewards | Both clients negotiate the active server quote and preserve reserved prices. Pending payment refresh/recovery added. Completed Ridge Road cleanup now displays its historical **$5 funded cleanup**, despite its remaining pool being zero; verified on live website. |
| Browser photos | JPEG/PNG/WebP/HEIC preparation, metadata stripping, resize, progress and bounded uploads. Actual chooser tests: 14.6 MB JPEG → 2.8 MB at 2400×1800; HEIC → JPEG; three decoded previews/photos synced. Fixed Strict Mode object-URL revocation. |
| Map flashing | Existing web pins stay attached across refreshed/reordered results; only removed reports detach, and changed artwork updates in place. Native report/cluster entrance fades removed while retaining previously tested iOS marker snapshot behavior. Live Google Map DOM pin IDs remained identical across sorting, panning, zooming, selection, Back and multiple refresh intervals. |
| Indexing/install | Robots, 17-URL eligible sitemap, manifest, public canonicals, private/preview noindex, real report anchors and meaningful legacy routes are live. All 17 sitemap URLs returned 200 with matching canonical URLs and no noindex. Malformed `/&` and `/$` correctly remain 404. |

## Verification and limits

- Full regression: 465 mobile, 213 web and 29 shared tests passed. The final cancellation change added one web test; its targeted 19-test suite passed, bringing the verified web suite to 214 tests. One native integration test is skipped in the default suite and passed in its explicit isolated run.
- Web/shared typechecks, lint, production build and boundary checks passed. Latest Vercel production build passed. 167 native modules passed source checks; iOS and Android Hermes exports passed. Native Expo web export is unsupported by Stripe's native UI; the customer website uses Next, not Expo web.
- 34 edge tests/typechecking passed. The three migrations were tested on the isolated PostgreSQL fixture before production. Production RLS is enabled; draft-photo bucket is private. Public RPCs are invoker functions with owner-checked private implementations.
- Live scheduled retention worker returned HTTP 200 with `drafts.removed: 0` after both draft migrations. No live draft existed to expire. The full expiry and cancellation cases were tested locally.
- Supabase advisors have no new ERROR. The private operation/cancellation ledgers intentionally have RLS with no client policies. The generic anonymous-sign-in heuristic flags authenticated policies even though `is_permanent_user()` explicitly excludes anonymous accounts; isolation tests verify this guard. Existing unrelated advisor warnings remain.
- Isolated browser/native-adapter tests use real PostgreSQL RLS with fixture Auth/Storage transport and Node shims for Expo filesystem/crypto. They are not claims of physical-device testing, live payment settlement or production OAuth testing. This pass did not charge/refund money, create public test reports or delete real accounts. Real cross-device TestFlight acceptance remains a user-testing limit.
- Luke's Apple developer access and a separate Facebook login remain unavailable. Apple revocation configuration and separate-user Facebook testing are excluded, not passed. Grant's Apple settings were not changed.

## Google status

The sitemap was submitted in Search Console October 1. Google accepted the submission; the sitemap report initially showed **Couldn't fetch / 0 discovered pages**. A subsequent Google live inspection at 15:39 EDT reported **Page fetch: Successful**, **Crawl allowed: Yes**, **Indexing allowed: Yes** for the sitemap. Normal and Googlebot-agent HTTP requests also returned valid XML/200. The sitemap report had not refreshed to success during the verification pass. Indexing itself remains asynchronous and is not promised.

The earlier seven exclusions were three expected host/protocol redirects and four 404 URLs. `/account/reports` and `/manifest.webmanifest` now exist; the two malformed URLs remain intentional 404s. Account pages should be noindex, so “every known URL indexed” is not the desired outcome. See [Google's sitemap report guidance](https://support.google.com/webmasters/answer/7451001).

Later October 1 follow-up: Search Console now reports **Success**, last read October 1, with **17 discovered pages**. The Page indexing aggregate remains last updated September 20 (14 indexed / 7 excluded), so it does not yet measure this release. Evidence: `docs/evidence/2026-10-01-web-ux-followup/google-sitemap-success.png`. The [subsequent UX audit](2026-10-01-web-ux-compatibility-followup.md) identifies remaining navigation, lifecycle, focus and responsive defects; the shipped feature inventory above should not be read as complete customer-journey acceptance.

## Release/rollback notes

The signed iOS 2.0.0/build 15 uses source `8370e5cf64346355c8cdd6d82a8e16120044f9b6`. Later work also changes native/shared code: draft synchronization rechecks account state before confirming an unchanged copy, and foreground notifications require a deliberate open/read action. These safeguards require a newer native binary; a website deployment does not update an already-installed app. Build `5a85bae2-0b95-4a8b-90b6-c30384fa5bfe` finished, and EAS submission `985b3f4e-6e87-4fda-82e6-9c66f096bf84` finished uploading it to Apple. Final Apple processing status is recorded in `docs/current-mobile-release-candidates.md`.

Website rollback can promote the prior known deployment `litterbugs-ixa9210jx-grant-9890s-projects.vercel.app`. Keep additive draft/preference tables and cancellation guards when rolling back clients: removing these would destroy customer recovery data and permit abandoned submissions to resume. Preserve quote compatibility and production pricing v1. No destructive rollback is authorized by this record.

Evidence: `docs/evidence/2026-10-01-web-parity/` contains browser verification, SQL checks, native-adapter integration, live crawl, deletion-auth smoke and screenshots (`live-map.jpg`, `google-sitemap-live-fetch.jpg`, `draft-photos-320.jpg`).
