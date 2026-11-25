# Isolated map fixtures

This is a separate **local simulator app**, named **LB Fixtures**, bundle ID `com.gegibson.litterbugs.fixtures`. It does not replace Litterbugs or use its account, drafts, Supabase data, Stripe client, or notification setup. Its JavaScript entry has no production bootstrap/provider imports and rejects fetch, XMLHttpRequest, and WebSocket calls. Apple Maps can still download its basemap through native MapKit.

The harness uses the **production ReportMapMarkers component, useMapLabels hook, cleanup status mapping, visibility rules, geographic bounds, and report filter functions**. Its test-only controls and simple report list are not a redesign or replacement of the product's screens. Existing app UI tests continue to cover the actual Map/Reports screens, profile, and report wizard.

## Dataset

- All states: available, claimed, completion submitted, changes requested, completed — each funded and volunteer (10 reports).
- Crowded: 80 deterministic reports, varied states/rewards, closely spaced coordinates.
- Same location: all 10 state/reward cases at one coordinate, exercising the overlap chooser and selection.
- Lifecycle: excludes cancelled/expired active reports but retains completed history.
- Empty: confirmed zero-result case.

Every record has a synthetic `fixture-` ID, synthetic owner, and `is_sample: true`. The fixture clock is fixed. **Never insert these records into live tables.** Choosing a marker only opens a read-only fixture preview; no upload, contribution, claim, or payout actions exist here.

## Build and open

Reuse an existing local Release simulator build (no cloud build or paid services):

```sh
python3 apps/mobile/qa/build_simulator.py \
  --base-app "/absolute/path/Release-iphonesimulator/Litterbugs.app" \
  --device YOUR_BOOTED_SIMULATOR_UUID
```

The script creates a new temporary directory, copies the native simulator shell, replaces its JavaScript bundle with `qa/index.js`, removes deep-link URL schemes, assigns the separate bundle ID, and signs it locally. It rejects device/distribution builds and disables dotenv/public environment injection while bundling. The original app is never edited. The output path is printed. Omit `--device` to build without installing.

Use All states / Crowded / Same location to change scenarios, the two filter rows to compare lifecycle and funding, and Reports to inspect the same filtered viewport collection. Zoom using gestures or the test controls. Counts expose both visible records and expanded amount labels. Selecting a crowded report must not change its underlying amount.

This is native marker/filter QA, **not end-to-end backend or payment testing**. Publication, refunds, payout failures, and webhook handling still require a separate backend and payment test mode before they can safely be exercised end to end.

## Native regression tests

After building/installing LB Fixtures, install the two test schemes:

```sh
GEM_HOME=/opt/homebrew/Cellar/cocoapods/1.17.0/libexec /opt/homebrew/bin/ruby apps/mobile/native-tests/install.rb
cd apps/mobile/ios
xcodebuild -workspace Litterbugs.xcworkspace -scheme LitterbugsFixtureRegression \
  -configuration Release -destination 'platform=iOS Simulator,id=YOUR_DEVICE_UUID' \
  -parallel-testing-enabled NO -resultBundlePath /tmp/lb-fixture-results.xcresult test
```

Use a new result path each run. The **LitterbugsFixtureRegression** scheme tests only the separate fixture app; the existing **LitterbugsUIRegression** scheme still tests the actual application. Neither suite submits payments or report data. Fixture tests exercise all funded statuses, volunteer completion, shared filter results, label visibility across zooms, and selection among coincident markers. Screenshots are attached to the `.xcresult` bundle.

The base app must be rebuilt from this checkout: it includes the iOS `annotationZIndex` compatibility patch. The builder verifies the native property exists and refuses stale binaries. The fixture regression suite exposed real iOS annotation reordering and resizing problems, now addressed by stable marker order, a dedicated native layer-priority property, and fixed host bounds across collapsed/expanded states.

Verified September 8, 2026: both fixture cases passed on iPhone 17 Pro and iPhone 13 mini with extra-extra-extra-large text. Both normal-app map regression cases also passed after the marker fixes. The mobile JavaScript suite passed 284 tests across 66 files.

## Returned-litter native check — November 25

`qa/site-history.js` is a separate UI entry for the actual ReportSiteActivity and
five-step ReportWizardModal/useReportWizardNavigation. It reads the public Hobby
Lobby cleanup through the live anonymous history API. It does not import the app
bootstrap, sign in, publish a report, upload media or send analytics. The final
wizard action is intercepted with a local confirmation. This is native UI QA;
publication/recovery/RLS are checked separately by service and backend tests.

Export with `expo export:embed --reset-cache`, an absolute **realpath** entry file,
`--platform ios` or `android`, `--dev false --bytecode --max-workers 1` and an
external bundle/assets destination. Set `EXPO_NO_DOTENV=1`,
`EXPO_PUBLIC_SUPABASE_URL=https://qa.invalid`,
`EXPO_PUBLIC_SUPABASE_ANON_KEY=local-native-ui-only`, analytics false, and PostHog
symbol upload false. These dummy credentials only satisfy the unused cloud-draft
module import; no QA session is created. Clear Metro cache when changing envs.

Reuse existing 2.1.1 native code; disable Expo Updates in the **QA copy only**.
iOS must use a separate simulator bundle ID `com.litterbugs.sitehistoryqa` with
URL schemes removed. Android must use a disposable cloned QA AVD and local QA
signature, never a physical device or the owner's existing app. Original apps,
auth storage and emulator data remain intact. Test devices run sequentially.
Production index.js never imports this entry, and prepared production bundles
are checked for absence of its dummy endpoint and QA text.
