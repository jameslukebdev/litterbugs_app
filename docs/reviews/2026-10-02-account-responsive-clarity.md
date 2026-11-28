# Website account clarity — October 2, 2026

## Scope and design decisions

Implements the approved follow-up to the website UX audit. Website components only; no native app redesign, backend migration, financial-rule change, or TestFlight submission.

- Shared header switches to compact navigation through 1100 px. Controls stay in normal flow and can wrap, rather than overlapping the logo. Signed-in Account keeps its accessible name with an avatar-only visual control.
- Embedded phone profile uses a two-column identity row and a separate Edit profile row. The account grid permits shrinking at 320 px; rank content can wrap.
- Activity navigation precedes attention and saved-work summaries. A confirmed empty attention state becomes one sentence; unavailable-data and sync warnings remain visible.
- Resume summaries label account and device copies, show title/photo count, and expose a direct resume action. Dates, location and expiration are expandable. Stale-copy warnings stay outside the disclosure. Draft selection, conflict handling and sync logic are unchanged.
- Contributions precede cleanup earnings, include report title/short ID, amount, fee, total and date. Unconfirmed payments and requested refunds use the same meaning as receipts. Embedded lists use normal page scrolling and contributions reveal five additional rows at a time. Volunteer history stays in Activity; earnings show completed paid work with existing reward status rules.
- Standalone receipts have a level-one page heading and a level-two amount heading. Embedded receipt heading hierarchy is retained. Attention and draft panels receive consistent padding.

Refero research from the preceding audit informed category navigation, payment/payout separation and identifiable history rows. The existing Litterbugs visual design remains the reference; no new palette or native navigation model was introduced.

## Verification

- 357 web tests in 71 files passed, including navigation order, receipt ownership/status handling, contribution identity, honest pending wording, progressive list disclosure, draft retention and conflict safeguards.
- Website typecheck, lint and boundary checks passed.
- Isolated local browser fixture: profile and receipt at 320, 375, 390, 430, 768, 1024 and 1474 px. Final document width equaled viewport content width at every size. Header controls fit at every receipt width.
- At 390 px, profile text has 239 px rather than the audited 42.5 px. Activity tabs begin at y=238 rather than y=1043 in the earlier live audit (fixture content differs).
- Keyboard Enter expands saved-version details; payment Show more reveals older rows; contribution opens its receipt with pending guidance and a page heading.
- Browser fixture has synthetic records only. No real payments, reports or account changes were submitted.

Evidence images and layout JSON are in the task artifact directory `responsive-release-oct2`. Browser emulation is not physical Safari/Android or screen-reader coverage. Localhost guest preview did not complete; signed-out checks remain for the deployed build. Cloud build and deployment verification are recorded in the task release report after completion.

## Memory and workspace hygiene

Tests ran with one worker, 512 MB Node heap and a process-tree guard. Final checks peaked at 538.3 MB before the boundary check. The webpack development preview hit its 1500 MB guard once, then ran with a 512 MB heap and restarted itself between some route compilations. Test tab and viewport override were cleaned up; the owned preview, fixture API and database were stopped. Production compilation is delegated to the existing Vercel cloud build.

Concurrent changes outside the website scope are excluded from this commit and deployment archive.
