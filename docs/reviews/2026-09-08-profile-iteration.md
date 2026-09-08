# Profile and recovery iteration

User-approved scope: implement the second audit recommendations locally, test the iOS simulator, then provide another UI/UX audit. No push or deployment.

## Reference lock and decisions

Preserve the existing white/green identity, system typography, actual bug artwork, and three bottom tabs. Use compact summary content and neutral navigation rows. Green means action/selection/success; amber means pending; red means failure/destruction. No decorative purple containers or yellow empty-state cards.

| Decision | Reference / requirement | Adaptation |
| --- | --- | --- |
| Profile overview with separate destinations | Airbnb account settings https://refero.design/screens/9f95a956-6c68-486c-929b-9e525e70d441; user request | My activity, Payments, Settings; normal back navigation |
| Compact rank and impact | Blackbird profile https://refero.design/screens/bc3cccdf-e072-4074-84ac-83fdcfb96f30 | Small artwork and progress; no large dashboard grid |
| Independent transaction details | Instagram orders/payments https://refero.design/screens/3c58b1b5-4be6-4187-8975-ce06bb3b7274; observed unavailable report | Recorded status and breakdown remain usable without report; refresh/help |
| Durable cleanup evidence | Airbnb save/exit https://refero.design/screens/e905ae7c-fe55-49dc-82e4-f520959b1af9 | Device-local photos, fields and stable submission ID; save/exit |
| Empty result recovery | Fresha https://refero.design/screens/0ccfad4b-b0b4-4ff9-bbec-0a105a1a8270 | Clear filters only in filtered empty state; retry on failure |

Submission recovery checks for an existing row under the stable ID before uploading; rechecks after an uncertain save and does not delete evidence after dispatch. Existing participant RLS remains unchanged. Payment refresh reads the recorded contribution status; it does not initiate a charge or promise an independent Stripe reconciliation.

Verification and follow-up audit will be added after simulator testing.

## Verification completed

- Mobile suite: **268 tests across 61 files passed**. New behavioral tests cover durable cleanup photo copies, user/cleanup isolation, interrupted copy preservation, serialized clear after autosave, recovering a committed submission without another upload, lost RPC responses, retaining evidence after an uncertain dispatch, and fallback to a usable town geometry when the optional postal lookup fails.
- iPhone 17 Pro, iOS 26.5: Release build succeeded, **zero errors**. The final raw xcodebuild log includes 75 warnings, primarily Hermes global-name diagnostics and build-script/dependency warnings; this is not a warning-free build.
- Replaced the existing `com.gegibson.litterbugs.qa` build, retaining account data. No second bundle installed.
- Simulator: compact Profile fits at default text size; My activity, Payments, Settings, Edit profile, Cancel, and back navigation open correctly.
- Larger text (`extra-extra-extra-large`): found and fixed clipped navigation labels by giving label text the available row width. Rechecked Profile and Settings successfully. Restored original `large` setting and relaunched.
- Payment history: amber pending badges; payment detail loads the existing record whose report is unavailable; refresh succeeds; the unavailable report link is replaced with an explanation. No charge or message sent.
- Search: entered Boone NC, pressed keyboard Return, selected the town area (not an address-only center). Reports retained Boone and showed the same two reports. In-progress filter returned zero; Clear filters restored two reports and retained Boone.
- Report detail and funding entry still open. No claims, submissions, account edits, or live payment completions performed.
- Inspected app log window: no TypeError, ReferenceError, unhandled exception or fatal message. This is scoped regression coverage, not certification of every app state.
- Cleanup draft/submission recovery: tested automatically, not end-to-end in the simulator because the signed-in account has no active cleanup.

Artifacts: `/tmp/lb-iteration2-tests.log`, `/tmp/lb-iteration2-final-ios.log`, `/tmp/lb-iteration2-runtime.log`, `/tmp/litterbugs-payments-iteration2.png`, `/tmp/litterbugs-profile-iteration2.png`.

## Next UI/UX audit (recommendations only)

1. **My activity: switch between Current, History, and Reports inside this destination.** The account with no current work currently sees several empty sections. Show one meaningful empty state for the selected view; keep current work first and history easy to reach as usage grows. Borrow category switching and history organization from Nike Training Club, not its oversized metrics: https://refero.design/screens/95e4a1e8-0714-4165-aa90-cf8b59dd4d3e. This is a follow-up refinement of the activity destination, not another bottom tab.
2. **Report detail: bring practical cleanup information earlier.** The first viewport currently gives substantial space to photo, title, author and dates before litter types and reported roadside/waterway notes. Keep the photo and primary action, but combine dates/author into a compact secondary group and surface known site conditions near the reward/location. Do not infer safety or fabricate duration estimates. Komoot's concise activity summary offers a reference for facts-before-expanded-details: https://refero.design/screens/18823ab3-84ff-4e6b-b78a-964430f8e9ae.
3. **Funding: keep total and Continue reachable while reading.** On the current viewport the explanatory paragraph pushes Continue below the fold. Use a compact persistent footer with the exact total and Continue; preserve material charge, fee and refund information and make full terms easy to read. Kickstarter's pledge screen separates the scrollable explanation from the total/action footer: https://refero.design/screens/6cbdc774-d9c9-4227-8ae4-b67cff6bcfd5. Adapt layout only, not its payment terms or extra payment options.

These next-pass recommendations were not implemented in this iteration. Keep the map's current chrome stable.
