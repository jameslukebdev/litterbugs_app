# Reporter earnings mobile release — October 21, 2026

The owner requested straightforward iOS and Google Play update preparation so users can see reporter earnings. The production source already contains the Reporter earnings section under Profile → Payments, reward amounts and statuses, report navigation, and shared payout settings. Existing production signing and bundle/package identifiers are retained. Store publication is not part of this preparation.

## Website investigation

Compared the actual October 8 production deployment `dpl_8egLeHRRVA2ETAxTcUD52j32WLXX` source-file SHA-1 hashes against the October 21 release. Report wizard, draft status, navigation, and other existing website files match. Changed existing files are limited to contribution pricing, policy/terms, account payments, and payout labels. New reporter earnings files were added. Retrieved the October 8 deployed stylesheet and compared its complete contents: the only difference is `.member-payout-action` top padding from zero to 16px. There is no evidence that today's deployment reverted the report form or changed its styling. Draft-status and wizard changes trace to October 1 commits under Grant's account. The owner was asked which specific behavior or earlier version they expected before any speculative redesign.

## Validation

483 existing mobile tests passed; one opt-in integration test skipped. Source validation passed for 169 mobile modules. Three additional reporter-display tests passed: truthful empty state, earned amount/Stripe-transfer status/report navigation, and retry after load failure. These component tests do not replace a physical-device walkthrough.

## Release notes

View reporter earnings in Payments, see the status of your rewards, and use the same payout settings for reporting and cleanup rewards.

## Build jobs

Both production jobs use version 2.0.0 and the existing production credentials.

- Android code 17: `8e141f46-49bd-4648-8f38-32383106709a`.
- iOS build 19: `7011470d-f2f6-45c6-a5e0-3c186fe63415`.
- Reported source commit: `b497a7e3d4c6526310a27c12834e02638fd4a7b6`.

Build completion and artifact verification are pending. No TestFlight, Play track, or public store submission has been performed.

## Website fixes requested during release preparation

The owner prioritized repairing the website before continuing app delivery. Deployed and visually verified on production `dpl_tdi7hMnKPxTFuZqcUyHBS7uTiigS`:

- Report Litter header links no longer inherit an underline.
- App download panel and download page render the existing permanent QR SVG inline, avoiding an image fetch/lazy-loading delay. Panel icon loads eagerly. QR path equality is tested against the original public artwork.
- Removed the global navigator.onLine banner. Actual action/save failures remain in their existing UI.
- Routine cloud-save status and timestamps no longer occupy the form; offline sync failure, conflict resolution and interrupted-submission recovery remain.
- Removed duplicate step enumeration; progress bar and current step remain. Location guidance appears at review.

410 website tests passed with Node experimental Web Storage disabled for the browser test environment. Type checks, lint and the production build passed. Live checks confirmed the QR artwork, header button, absent global banner, and uncluttered photo/title step. No report was published and no payment was made.
