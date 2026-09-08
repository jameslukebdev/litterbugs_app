# Mobile review implementation

Branch: `codex/refero-mobile-improvements`. No main push or production deployment.

## Approved reference direction

Keep Litterbugs' logo and green foundation. Use komoot's compact map controls and clear cleanup action hierarchy as the dominant product pattern, adapted to the user's requested Zillow-like top filters. Preserve real report photography. Borrow only payment-ledger clarity from Copilot and persistent waiting states from District. Strava, Ecosia and Open Collective inform restrained color roles, not marketing layouts.

| Decision | Evidence | Adaptation |
| --- | --- | --- |
| Shared map/list filters | [komoot map](https://refero.design/screens/d911c309-bd51-454b-ad5b-410ae4a92ab6), [filter flow](https://refero.design/flows/8349), user request | Search reports, status chips, filter sheet, optional area search. Logo integrated into header. |
| Photo-led report details and primary cleanup action | [komoot detail](https://refero.design/screens/49441620-05c7-4afd-9476-3675382e4f64), user approval | Actual photo first, persistent green “Help clean this up,” directions. |
| Payment activity and separate completed impact | [Copilot transactions](https://refero.design/screens/85a7e19f-6f09-46d3-b4f8-ed234a1ad3d8) | Include pending, failed and refunded contributions without implying a charge succeeded. |
| Recoverable payment and payout states | [District waiting screen](https://refero.design/screens/cbe76f68-584b-4fa7-a5e6-0183ca97c490), [flow](https://refero.design/flows/12837) | Persistent account-scoped payment identity; read server state before retry; payout unknown/error distinct from not-started. |
| Minimal reporting improvements | User constraint and [Julienne flow](https://refero.design/flows/6497) | Keep wizard sequence, save/resume details and copied local photos, volunteer default and fewer reward choices. |

## Verification scope

Public simulator flows and automated recovery tests are exercised without creating production reports, charges or payout accounts. Live read-only report pagination and photo signing were checked. Actual payment/payout completion needs an authenticated Stripe test environment; this review does not represent a live charge as verified.

## Results

- Mobile suite: 238 tests passed across 54 files.
- iPhone 17 Pro / iOS 26.5 Release simulator build: succeeded, zero errors. Five native dependency/build warnings remain.
- Simulator: launch, shared funded filter and result count, list reward accessibility, photo-first report details, visible primary cleanup action, guest authentication gate, and city search exercised.
- Payments: automated tests cover saved attempt identity across navigation/restart, account isolation, processing/webhook delays, confirmed receipts, refund states, offline recovery, and late responses from older attempts.
- Drafts: tests cover persisted photo copies, interrupted-copy preservation, account isolation, and autosave/discard ordering.
- No production records, payment transactions, payout accounts, or backend configuration changed.

- Final simulator QA found and fixed a gallery null-report crash on dismissal. A rendered-component regression test now covers stale photo URLs during dismissal and subsequent report rendering.
