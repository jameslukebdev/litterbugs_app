# Isolated map QA follow-up

## Completion of the prior audit recommendations

| Recommendation | Implemented evidence |
| --- | --- |
| My reports independent of Map | `lib/accountReports.js` paginates by owner; `useAccountReports.js` owns loading and request races; Profile has Active/Completed/Closed views. Map and Reports retain their shared discovery collection. |
| Three report stages | `components/ReportWizardSteps.jsx`: Photos plus optional title; Details; Review with location, evidence and funding. Required validation and draft recovery preserved. Stage transitions reset scroll to the top. |
| Distinguish loading, empty and errors | `ReportPreviewPhoto.jsx` resolves photos with placeholder, confirmed missing state and retry; Cleanup History has separate loading/error/empty branches. |
| Standard wording and emphasis | Map preview, list and details use Cleaner reward; completed preview avoids duplicate completion text; low severity list/profile cards use neutral emphasis. |
| Extract map responsibilities | Wizard, details, marker rendering and styles extracted; MapScreen is 2,796 lines rather than about 6,200. Legacy marker presentation module/tests removed. This is an incremental extraction, not a complete state-management rewrite. |
| Test actual native UI | Six native cases passed on iPhone 17 Pro; both map cases also passed on iPhone 13 mini with larger text. Smaller-device account/keyboard/draft coverage remains limited because it was a guest. |

See the earlier [research and validation record](2026-09-08-map-labels-and-report-flow.md) for the Zillow/Refero references and test limitations.

## New follow-up

`apps/mobile/qa` provides deterministic synthetic map records and a separate local simulator app using the existing production marker renderer, label layout, filters, and visibility functions. No product design changes are introduced: the reference lock remains the existing Zillow/Refero map direction. Harness controls are test tools, not additional production UI.

Fixtures cover five lifecycle states × funded/volunteer, 80 crowded reports, coincident coordinates, an empty collection, expired/cancelled records and completed history. Each record is sample-labelled and has a synthetic identity. No records are seeded into Supabase. JS backend transports are blocked, backend/auth/payment providers are absent from the fixture dependency graph, and the app uses its own bundle ID.

This extends native marker/filter coverage. It does not simulate an entire Supabase or Stripe backend; end-to-end publication, refund, payout and webhook tests remain a separate future task requiring an isolated backend and payment test mode.

## Bugs exposed by the fixtures

The coincident-marker case reproduced a selected completed marker disappearing. The 80-report zoom case also reproduced an iOS abort in `AIRMap insertReactSubview:atIndex:` through React Native's legacy component interop. Label priority was changing annotation ordering, and the reserved React Native `zIndex` property also participated in native child reordering.

The renderer now keeps stable ID order. A two-line addition to the existing react-native-maps patch exposes `annotationZIndex`, which updates MapKit's annotation layer without using Fabric's reserved child-ordering property. Android retains the existing zIndex API. This native change requires a rebuilt iOS binary; the fixture builder rejects old binaries missing the property.

Screenshot review then caught expanded labels appearing at the map corner. Marker host dimensions are now reserved before projection and stay fixed when labels collapse or expand. Overlap hit testing uses the same reserved bounds. The native fixture case checks the selected marker's center against its original map position, in addition to verifying the amount and selection preview.

## Final validation

- 66 JavaScript test files, 284 tests passed, including synthetic fixture coverage, production filter/visibility/label behavior and transitive backend-import/network-guard checks.
- Both new native fixture cases passed on iPhone 17 Pro and on iPhone 13 mini with extra-extra-extra-large system text. They verify all funded statuses, volunteer completion, shared filtered collections, zoom-dependent labels, overlap selection and unchanged selected-marker coordinates.
- Both actual-application map cases were rerun after the fixes and passed: Map/Reports synchronization and marker zoom/pan/selection. Existing account/profile/wizard tests remain separately available.
- Screenshot review verified the completed $48 selection is centered at the report's real map position and drawn above coincident markers. Earlier failed runs exposed the ordering, crash and frame-position issues described above; all final runs passed without skips.
- Smaller-device text size restored. Only local builds/fixture state changed; no backend report/profile/financial mutation and no production push.
