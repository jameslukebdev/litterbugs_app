# Marker funding and selection feedback

## Reference and decision

The user's feedback identified a real comprehension problem: a leaf did not communicate an empty funding pool. The existing Zillow/Refero map direction remains the reference lock. Computer use on the user's Zillow Chrome tab confirmed a compact 170K pill becoming larger on selection, with the corresponding listing highlighted and preview opened. The user-provided 8:58 PM screenshot is the density/padding reference.

Adaptation for Litterbugs:

- Explicit $0 for reports with no funding, using the same amount treatment as funded reports. No leaf legend to learn.
- Map preview and report details say "$0 in pool · No donations yet" for unfunded reports.
- Compact default pills: 24-point minimum height, 13-point text, 6-point horizontal padding; status circles 20 points with 11-point icons; collapsed dots 10 points.
- Selected pills enlarge by 20%, switch to dark green/white and retain top annotation priority. The native host always reserves enlargement space, so selection does not resize or reposition the annotation host. Touch targets remain at least 44 points.
- Collision allocation considers the selected visual size. Amounts can collapse in crowded views, but selection reveals the amount, including $0. The clock/check communicate cleanup status independently of funding.

Only iPhone 17 Pro is left running. The smaller QA simulator was shut down at the user's request. The separate fixture app is used only during verification; normal Litterbugs is the final presentation build.

## Validation

- 285 JavaScript tests across 66 files pass.
- Both normal-app native map tests pass on iPhone 17 Pro: zoom/pan/selection and Map–Reports filter synchronization.
- Both final fixture native cases pass: all funding/status combinations (including explicit $0 and selected zero funding), density/zoom, and overlap selection with coordinate stability.
- The first overlap run exposed a native priority tie: MapKit boosts its tapped annotation by 999, so a different report chosen in the overlap list could cover the app-selected label. Raising app-selection priority to 2000 resolved the collision. The final screenshot confirms the selected check/$48 label is unobstructed and centered.
- Final Release simulator build succeeded and was installed as the normal `com.gegibson.litterbugs.qa` app on iPhone 17 Pro. The fixture process was terminated; the smaller simulator remains shut down. No backend or financial mutations were performed.
- This pass used iPhone 17 Pro; smaller-device/larger-text coverage from the preceding iteration was not rerun after these sizing changes.

## Selection enlargement follow-up

Following the user's 9:29 PM Zillow screenshot, increased the selected scale from 1.2 to 1.5 (50% larger than the default marker). The shared scale also reserves native host space and adjusts selected-label collision bounds. All 287 JS tests and the actual iPhone 17 Pro zoom/pan/direct-card selection test pass. Manual computer use verified the enlarged $6 remains centered and its card opens directly. Left that selection visible in the normal app.
