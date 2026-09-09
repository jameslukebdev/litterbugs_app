# Open the tapped report directly

## User problem and evidence

Tapping the visible $6 marker opened "Reports here" rather than its preview card. `reportsNearMapTap` grouped annotations whenever their invisible reserved touch hosts overlapped. Those hosts are deliberately larger than the drawn markers for accessibility and selection stability, so visually distinct reports were incorrectly treated as ambiguous.

Refero research reused the established map direction:

- Airbnb iOS: https://refero.design/screens/ef371a8b-cb56-4f4a-a209-fa7b1552a4fb — inspected screen image and metadata; map price pins and contextual property content. Metadata describes tapping a price bubble for that property. Static screen evidence does not establish Airbnb's exact overlap algorithm.
- Fresha iOS: https://refero.design/screens/caaf1729-7b57-49cb-9301-8cdbe95cdf63 — map browsing and filter/list access remain separate controls.
- Earlier live Zillow observation: selecting a specific amount highlights that listing and opens its preview.

Decision: trust the annotation identified by the native tap. Open its existing report card directly unless multiple report centers are within six screen points of one another (visually almost the same point). That exceptional case retains the chooser so coincident reports remain accessible. This threshold is a Litterbugs implementation choice, not a claim about the reference apps.

Keep the 44-point minimum touch targets, compact styling, selected enlargement, and Map–Reports filtering. Touch-area overlap no longer changes navigation.

## Verification

- 287 JavaScript tests pass, including distinct markers whose invisible touch bounds overlap, near-coincident points, missing projection, and all coincident records remaining accessible.
- The actual-app native marker test now requires "View report" after tapping the $6 annotation and rejects "Reports here". Previously it accepted either outcome, which missed this UX regression.
- Final native test passed on iPhone 17 Pro, exercising zoom, pan, and a direct $6-to-card selection with no chooser. The initial stricter run exposed an accessibility lookup issue: the visually correct View report button inherited its icon glyph in its label. An explicit accessibility label fixes the announcement and lookup; the final run passes.
- Updated normal Litterbugs build installed and reopened. No backend writes, report submission, or financial activity.
