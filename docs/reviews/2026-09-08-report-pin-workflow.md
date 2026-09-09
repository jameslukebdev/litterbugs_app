# Report creation: user-selected map location

## Problem and intended behavior

Report Litter waited for a device GPS fix before showing the location picker, then requested a second fix before allowing the report workflow to advance. With simulator GPS unset, this ended in a timeout. These checks predated the account-history iteration. The user clarified that reporting should start with a pin at the current map center and should not require knowing the device's location.

## Reference lock and decisions

Keep Litterbugs' existing green actions, white surfaces, compact floating controls, and Photos → Details → Review flow. The existing product is the visual authority; no marketing-style redesign is introduced.

- [Uber Eats meeting-spot confirmation](https://refero.design/screens/bab12cb3-802d-45e8-a571-ea03b396393e), visually inspected: separate map-pin placement from optional recentering, explain the precise site to choose, and require explicit confirmation. Adapted to litter-site wording and existing controls. Align the visible target to the actual map center.
- [Pool location issue report](https://refero.design/flows/11982), flow retrieved and form screenshot inspected: retain photo evidence while users complete and revise the report. Add Change report location in Review without resetting form fields, photos, funding choice, or review step.
- [Expo location documentation](https://docs.expo.dev/versions/v54.0.0/sdk/location/) and [permissions guide](https://docs.expo.dev/guides/permissions/): obtaining coordinates and obtaining permission are separate operations. A simulator needs a simulated GPS position; permission alone cannot supply one. Request permission through the explicit location-finder action, not report creation or passive map initialization.

## Implementation

- Report Litter places a pin at the current map center without GPS calls, automatic recentering, or a Finding you spinner. The user moves the map and confirms the site.
- Removed both report-only GPS checks and the obsolete client distance policy. A confirmed coordinate is still required; invalid/missing/out-of-range coordinates are rejected. Existing authentication, photo, details, and submission validation remain.
- Location finder remains an optional action with existing permission/settings and GPS error recovery. Passive initialization checks existing permission without requesting it.
- Review provides Change location. Confirming returns to the same review; canceling retains the original coordinate and draft.
- Untouched forms close without a misleading discard prompt caused by the default no-funding value.
- Removed obsolete source assertions that required GPS gating; retained workflow contracts and added native regression coverage.

## Validation

305 JavaScript tests passed. Final native iPhone 17 Pro tests passed and exercise report entry without GPS, the full three-stage form without publication, changing the review pin while retaining evidence, and local draft recovery. Computer-use walkthrough confirmed immediate placement on the normal QA build with location access revoked. Query/backend data was not changed; no report, payment, cleanup claim, or profile edit was submitted.

Evidence: `/tmp/lb-report-pin-final.xcresult`, `/tmp/lb-report-pin-clean.xcresult`, exported screenshots `/tmp/lb-report-pin-shots/`, and JavaScript results `/tmp/lb-report-pin-final-js.log`. An intermediate draft run was blocked by the simulator software keyboard being hidden; enabling it while the input was focused resolved the test, and the final draft/entry run passed without skips. Real-device GPS is not part of this verification; reporting no longer depends on it.
