# September 10 mobile refresh merge verification

## Scope for Luke’s testing

This is the final inventory for the September 9–10 refresh. Earlier audit entries describe historical intermediate states and rollbacks.

- Reports and map: matching image-first cards, compact shared details, photo carousels, favorites, funded-card treatment, and app-styled sort/report actions.
- Report detail and completed cleanup: safe header spacing, consistent before/after evidence, compact impact and reporter sections.
- Profile, activity, payments, settings and their app-owned subpages: consistent surfaces and typography, clearer copy, stable action labels, and navigation back to the existing map stack.
- Report creation: five-stage photo-first wizard, persisted draft migration, and relative local photo paths that survive iOS container relocation.
- Cleanup fund: owners can open photo editing directly from a better-photos decision. Waiting reviews refresh in place; no Check again/logo transition. Editing still checks ownership and report locks using a fresh report read.
- New native checks use current Settings/payment labels and cover the owner’s funding-to-photo-editor path.

## Automated verification

- Mobile: 364 tests in 81 files passed, including pending-payment replacement, draft migration, favorites, and stable button/review-state behavior.
- Web: 104 tests in 28 files passed.
- Shared report contract: 10 tests in 3 files passed. Its old parity test referenced a removed mobile location-policy module and assumed the web and mobile wizards had identical step layouts. It now checks shared persisted option values and limits against the extracted mobile components. Independent web distance rules remain unchanged.
- Mobile source: 147 modules, zero errors.
- Web production build and boundary check passed (377 source/build files).
- Workspace type checking and web lint passed (final `/tmp/lb-merge-final-*` logs).
- All 11 configured Edge Function entry points type-check; 16 financial boundary tests and 7 Gemini relay tests passed. Auth bridge dry-run succeeded.

## Native verification

All 14 ordinary native scenarios passed across `/tmp/lb-native-final-corrected.xcresult` (12 passed) and `/tmp/lb-native-keyboard-visible.xcresult` (2 passed). The earlier draft failure and dependent pin-test skip were resolved in the latter run by showing the simulator software keyboard while the field was focused. The test typed a local title, saved, reopened and discarded that draft. It did not upload photos or publish a report.

Earlier failures also exposed stale selectors for the old card action, payment-tab role and Settings popup; those tests now follow the refreshed controls. The funding photo-recovery case opens the personal report independently of map bounds and verifies the editor’s replacement-photo action. A trial change to report tap handling did not resolve the simulator keyboard issue and was reverted; it is not part of this merge.

The largest accessibility text check also passed on iPhone 17 Pro (`/tmp/lb-final-largest-text.xcresult`) and iPhone 13 mini (`/tmp/lb-final-small-largest.xcresult`). These exercise visible, nonoverlapping map/report controls on both sizes. Signed-in profile, payment and report-edit checks ran on the primary phone; they were not repeated on the guest small phone.

The original text sizes were restored, synthetic locations cleared, the small simulator shut down, and the normal QA app restored on the primary simulator. Only empty drafts created during failed keyboard checks were removed; the successful draft test discarded its own draft. No preview app links or preview footer were added to production. The user cancelled screenshot delivery.

## Nonvisual review

Photo upload byte/type limits, authenticated processing, private quarantine, server-side safety processing, failed-upload cleanup, and automatic report review remain. The owner-requested removal of the separate photo consent gate is included; Settings and the public privacy source describe automatic processing. This merge does not resolve the separate App Store disclosure/permission release gate documented in the historical audit.

Payment attempts keep their saved identity while submitted, processing, or uncertain. A changed amount only clears an unsubmitted attempt after its provider status is checked. No live charge, payout, cleanup claim, report publication, moderation action, account deletion, sign-out, or profile save was performed for this verification. Existing account data and personal drafts must be preserved.

No backend migrations, Edge Function deployments, signed store artifacts, or app-store submissions are part of this merge. Existing release-candidate binaries must be rebuilt to include these changes.

## Screenshot and local-tool boundary

The earlier visual gallery is `artifacts/page-refresh/index.html` (local, ignored). It contains explicitly labeled synthetic previews of copied production components. The preview app and its isolated simulator were removed. Production source has no LB Previews links, sample-data footer, or preview routes.

The local `.agents/` directory, editor swap file and `skills-lock.json` are excluded from the commit.
