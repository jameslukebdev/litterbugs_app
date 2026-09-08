# Map labels and report-flow iteration

## Reference lock

Primary: the user's Zillow mobile/Boone screenshots and live Chrome zoom study. Preserve the unobstructed map, compact pill markers, dots in dense areas, consistent green/white controls, and synchronized Map/Reports filters. No numbered clustering, financial changes, or additional permanent controls.

Live Zillow computer-use observations: zoomed from regional level 7 through 8, 11, and 12, then back to 10 using its actual zoom buttons. Dots and amount pills coexist; label visibility and the result list refresh after the map settles. Small feature icons also appear in some markers. The exact selection/ranking algorithm is not exposed; Litterbugs uses deterministic screen-space collision allocation as an adaptation.

Secondary references:
- [Airbnb map](https://refero.design/screens/ef371a8b-cb56-4f4a-a209-fa7b1552a4fb): compact white price pills, small feature icons, selected preview.
- [Fresha map](https://refero.design/screens/caaf1729-7b57-49cb-9301-8cdbe95cdf63): numeric pins coexist with smaller dots.
- [Pool reporting flow](https://refero.design/flows/11982): group related report fields and photo evidence.
- [Uber Eats loading](https://refero.design/screens/b88bc5d6-b2be-45b3-8cb1-a673ea109ad5): neutral placeholder until content is resolved.

## Decisions and implementation

| Decision | Basis | Implementation |
| --- | --- | --- |
| Vary label visibility with available screen space | Live Zillow + user correction | Native coordinate projection; deterministic collision handling; no reward-value ranking or amount changes |
| Keep cleanup state visible | User request | Fixed 14-point clock/check; preceding funded amount when there is room; fixed 28-point icon circle when crowded |
| Show unfunded cleanups without implying a payment | User request + existing vocabulary | Leaf marker; “Volunteer cleanup” in preview |
| Preserve overlapping report access | User accepted Zillow overlap | Every report remains a marker; overlapping touch targets open the existing chooser |
| Personal activity independent of map | Code audit | Paginated query by account; Active, Completed, Closed states; request race guards |
| Three report stages | User-approved Pool adaptation | Photos plus optional title; Details; Review including location, evidence and optional funding |
| Honest loading/error states | User-approved loading reference | Neutral photo placeholder, confirmed missing state, forced signed-URL retry; history loading/retry/empty states |
| Reduce screen responsibilities | Approved architecture recommendation | Extract wizard, details, markers and styles; remove obsolete marker presentation implementation/tests |

The map's report records, funding amounts, status lifecycle, eligibility checks, and geographic list filtering remain owned by their existing data sources. Marker decluttering changes presentation only. Personal account reports have their own query and never change the discovery collection.

## Validation

See the native test README for repeatable simulator coverage. JavaScript tests cover label priority and visibility without monetary changes, required evidence/details validation, owned-report pagination/grouping, photo loading/retry/stale-request handling, and the existing safety/funding/draft contracts. Native tests run native zoom, pan, selection, filters, keyboard, Back and local-draft recovery. Test failures and skips must be reported; a unit-test pass is not proof of native rendering.

No backend report/profile submission, cleanup claim, contribution, payout, subscription purchase, or production push is part of this iteration.

### Verified results

- Mobile JavaScript suite: 65 test files, 279 tests passed.
- iPhone 17 Pro, iOS 26.5: marker zoom/pan/selection, Map/Reports filter synchronization, personal reports independent of map, visible profile Save with keyboard and Back protection, and local draft recovery all passed in native XCUITest runs. No skips in these successful runs.
- A sixth native case passed through the real photo picker, selected a local QA image, scrolled Details, chose litter type and severity, and reached Review. It discarded its own draft without submitting. The initial picker test needed a coordinate tap because PHPicker's image element reports itself as not hittable; an interim retry correctly skipped while preserving the failed run's local draft, which was inspected and cleared before the successful run.
- Screenshot inspection caught Review inheriting Details' scroll offset. The step scroll container now resets when stages change, and the native case asserts the Review heading is visible on arrival.
- iPhone 13 mini, iOS 26.5, extra-extra-extra-large system text: both native map cases passed. Screenshot review caught a Report Litter icon overflowing its button; the button now grows with text and the final screenshot confirms alignment. Text size restored after testing.
- The smaller simulator is a guest; account-specific tests were exercised on the signed-in 17 Pro. Its existing account has no owned active reports, so personal-activity integration verified a confirmed empty collection remains independent; owned-record pagination and grouping have separate unit coverage.

### Next audit priority

Create an isolated QA dataset with funded available, in-progress, completed, and volunteer reports at several map densities. This would let native tests verify every status/amount combination and failed publication or payment states without altering live records or moving real money. Current native map fixtures cover the available $6 marker and an unfunded completed marker; funded clock/check rendering is also covered in component tests.
