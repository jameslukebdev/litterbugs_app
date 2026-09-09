# Native iOS regression tests

This is an XCUITest suite, not a React Native component mock. Its Swift source lives outside Expo's generated `ios/` directory. The installer adds a reproducible UI test target and shared Release scheme after prebuild; generated Xcode files remain ignored.

Prerequisites: local Xcode/iOS simulator, existing Expo iOS project with pods, and Ruby's `xcodeproj` (already included with CocoaPods). On this machine:

```sh
GEM_HOME=/opt/homebrew/Cellar/cocoapods/1.17.0/libexec /opt/homebrew/bin/ruby apps/mobile/native-tests/install.rb
cd apps/mobile/ios
xcodebuild -workspace Litterbugs.xcworkspace -scheme LitterbugsUIRegression -configuration Release -destination 'platform=iOS Simulator,id=YOUR_DEVICE_UUID' -parallel-testing-enabled NO -resultBundlePath /tmp/litterbugs-regression.xcresult -skip-testing:LitterbugsUIRegression/LitterbugsUIRegression/testLargeTextMapControlsWithoutLocation test
```

Use a unique result path per run. The app bundle is `com.gegibson.litterbugs.qa`. Tests wait for hittable launch controls and retain screenshots in the result bundle. The generated test runner uses ad-hoc simulator signing so Xcode installs changed test code. If an older unsigned runner was installed, uninstall only `com.gegibson.litterbugs.uiregression.xctrunner` once; never uninstall the user app to reset tests.

The suite sets a fresh, accurate Boone location through XCTest’s native location API on each test and clears the XCTest location override in teardown. After interrupted runs, also run `xcrun simctl location YOUR_DEVICE_UUID clear` before handing the simulator back. These coordinates are synthetic, never the developer’s physical location. Enable Simulator → I/O → Keyboard → Toggle Software Keyboard before keyboard tests.

Run on a standard iPhone, a smaller iPhone, and with the largest accessibility text (`xcrun simctl ui DEVICE content_size accessibility-extra-extra-extra-large`); restore the original text size afterward.

The current map integration cases use the existing Boone QA reports: the $6 available Howard’s Creek Road report and completed Trash on Castle Ford. Keep the public discovery filters clear before running, and do not modify those records to satisfy a test. Dataset-dependent skips must be reported.

Profile and draft tests require an already signed-in QA account. The suite does not create credentials or bypass authentication. Profile edits are discarded, never saved. Draft testing writes and then deletes only its own local draft; an existing user draft causes a skip. If a test fails after saving its own draft, inspect and remove the draft titled “QA123456” before rerunning. Never discard a different draft.

Never automate a contribution, payment, payout, claim, report submission, or real profile save against the connected backend. Those need a separate isolated backend fixture environment. The suite does not provide end-to-end payment or report-publication coverage.

The three-stage form case also requires a local simulator photo. It selects the first PHPicker image, scrolls through Details, reaches Review, and discards its own draft without uploading. The picker can trigger the app's background draft recovery; after a failed run, inspect and clear only the draft created by that run before retrying.

Verified on September 8, 2026: all six cases passed on iPhone 17 Pro across targeted runs; both map cases additionally passed on iPhone 13 mini with extra-extra-extra-large system text. The smaller device was a guest, so signed-in cases were not run there.

The installer also creates the separate `LitterbugsFixtureRegression` scheme. It is deliberately excluded from the normal app suite because it requires the optional LB Fixtures app. See [isolated fixture instructions](../qa/README.md). The fixture scheme adds repeatable marker status/funding/density coverage without reading or changing backend records.

## Strict regression runner

After installing the test targets, run from the repository root:

```sh
npm run mobile:test:native -- --device YOUR_DEVICE_UUID --suite smoke
npm run mobile:test:native -- --device YOUR_DEVICE_UUID --suite large-text
npm run mobile:test:native -- --device YOUR_DEVICE_UUID --suite fixtures
```

The largest-text test is separate from the ordinary smoke suite. The runner uses the largest accessibility category, restores the previous category, clears synthetic location on exit, and rejects failed or skipped coverage. Fixture builds must first be refreshed using `qa/build_simulator.py`. Boot only the intended simulator. Keep software keyboard enabled for form tests. A missing account, user draft, or unavailable QA record blocks the corresponding smoke coverage; do not treat its skip as a release pass.

`npm run mobile:check-source` additionally checks JSX and undefined identifiers, which mobile JavaScript unit mocks can miss.
