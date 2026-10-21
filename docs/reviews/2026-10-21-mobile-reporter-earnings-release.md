# Reporter earnings mobile release — October 21, 2026

The owner requested straightforward iOS and Google Play update preparation so users can see reporter earnings. The production source already contains the Reporter earnings section under Profile → Payments, reward amounts and statuses, report navigation, and shared payout settings. Existing production signing and bundle/package identifiers are retained. Store publication is not part of this preparation.

## Website investigation

Compared the actual October 8 production deployment `dpl_8egLeHRRVA2ETAxTcUD52j32WLXX` source-file SHA-1 hashes against the October 21 release. Report wizard, draft status, navigation, and other existing website files match. Changed existing files are limited to contribution pricing, policy/terms, account payments, and payout labels. New reporter earnings files were added. Retrieved the October 8 deployed stylesheet and compared its complete contents: the only difference is `.member-payout-action` top padding from zero to 16px. There is no evidence that today's deployment reverted the report form or changed its styling. Draft-status and wizard changes trace to October 1 commits under Grant's account. The owner was asked which specific behavior or earlier version they expected before any speculative redesign.

## Validation

483 existing mobile tests passed; one opt-in integration test skipped. Source validation passed for 169 mobile modules. Three additional reporter-display tests passed: truthful empty state, earned amount/Stripe-transfer status/report navigation, and retry after load failure. These component tests do not replace a physical-device walkthrough.

## Release notes

View reporter earnings in Payments, see the status of your rewards, and use the same payout settings for reporting and cleanup rewards.
