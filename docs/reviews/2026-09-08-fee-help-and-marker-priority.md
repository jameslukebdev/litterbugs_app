# Fee help and marker priority

Keep the existing neutral fee breakdown and green/white map system.

## Design evidence
- [Omio fee explanation](https://refero.design/screens/40648bd7-2e3d-4bc5-8cf0-04cc82029c67): inspected full metadata and image. Place a small help icon adjacent to the fee label; expose explanation only on demand.
- [Orbit financial explanation](https://refero.design/screens/5e11f72b-f8d6-4610-9d46-aec0bc5ba5b2): inspected full metadata. Use plain explanation and a clear dismissal action. Litterbugs uses a short native alert because the content fits a small popup.
- User request supplies fee purposes: maintenance, transaction costs, safety development. Copy says 'helps cover'; no invented allocation percentages or promise of particular safety outcomes.

## Implementation
Shared FeeExplanationLabel shows an 18-point question icon with a minimum 44-point-high tappable label. The popup has a single Got it dismissal action and does not invoke payment code. Applied to funding checkout, initial report funding breakdown, contribution history, and payment detail.

The map dot was a deliberate collision fallback, but report-ID ordering gave a completed marker space before an available cleanup. Layout now orders selected report, available, in progress, completed, then stable ID. Reward size is not a priority. All reports remain present and the overlapping-report chooser remains available.

## Verification
- 272 tests across 62 files pass. Added regression coverage for available $6 versus completed collision, stable fetch order, selected completed priority, and in-progress versus completed.
- Release simulator build succeeds; pre-existing dependency warnings remain.
- Installed on iPhone 17 Pro iOS 26.5. Boone overview shows $6 label and completed dot; tapping opens a chooser with both reports.
- No payment submitted or Continue-to-payment action invoked. No production data changed. No push to main.
- Simulator: fee icon sits beside its label without displacing the amount; popup displays all three cost categories and contribution explanation; Got it dismisses. Funding amounts were not edited in this verification.

## Follow-up: retain compact status identity
The initial priority correction still represented a completed report as a blank dot when its full label did not fit. User feedback showed this was confusing. Compact completed/in-progress markers now retain a 14-point checkmark/clock inside a 22-point neutral circle. Existing minimum 44-point touch targets and nearby-report chooser are unchanged. The available reward retains label priority unless another report is selected.

Verification: 272 tests pass, Release build succeeds, and installed simulator at Boone overview visibly shows both $6 and the compact checkmark. Tapped the completed marker, selected the completed report in the nearby chooser, and verified its Cleanup Complete preview. Returned simulator to the Boone overview. No payments or production data changes.
