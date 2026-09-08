# Compact map toolbar — September 8, 2026

## Reference and scope

Primary reference: the user's Zillow mobile screenshot (`1-Photo-1.jpg`). Preserve the search/filter arrangement, horizontal removable filter chips, compact bottom action, and aligned circular map controls. Adapt colors to Litterbugs: white search/control surfaces, dark green primary action with white text/icon, pale green chips with a dark green outline. Keep the map as the main canvas.

The previously reviewed [Airbnb Filters reference on Refero](https://refero.design/screens/1095dff6-ceb7-4859-b498-a8519f9a1607) supports grouped filters in one sheet and a persistent results action. This is a focused toolbar iteration; the broader code/UX audit recommendations remain separate.

| Decision | Source | Implementation |
| --- | --- | --- |
| Filters beside search | User's Zillow screenshot | One 52-point circular button on both Map and Reports |
| Cleanup status inside Filters | Explicit user request | First group in the shared filter sheet; separate status dropdown removed |
| Removable active chips | User's follow-up and screenshot | Horizontal scrolling row; each chip resets only its own filter; count includes status and keywords |
| Smaller chips with fuller text | Explicit user refinement | 32-point minimum visible pill with reduced padding, inside a minimum 44-point tap target |
| Compact primary action | Explicit user refinement | 152 × 44 dark green Report Litter pill, white 16-point label and white icon |
| Aligned map controls on the left | User's screenshot | Map style and location are 44-point circles sharing the CTA baseline |
| Keep placement and preview usable | Existing app flow | Controls move above a preview or location-confirmation row; Cancel remains available |

## Verification

- Release iOS build succeeded and was installed over `com.gegibson.litterbugs.qa` on the existing iPhone 17 Pro simulator, preserving the signed-in account.
- All 273 tests across 62 files pass. `git diff --check` passes.
- Simulator inspection confirmed the single filter entry, cleanup status inside the sheet, active-count badge, and shared filters across Map/Reports. Removing a filter in Reports updated Map while preserving the other filters.
- Visually inspected the compact green Report Litter button and aligned circular controls on the installed build.
- Automated horizontal drag/scroll input was unreliable in this simulator session; it did not establish a successful carousel swipe. The carousel uses React Native's horizontal ScrollView. Do not describe this as exhaustive gesture or device-size testing.
- No payment or report submission was performed. No backend changes or push to main.
