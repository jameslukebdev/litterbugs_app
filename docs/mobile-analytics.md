# Mobile app analytics (PostHog)

Code: `apps/mobile/lib/analytics.js` (events, timers, gating), `apps/mobile/lib/analyticsPrivacy.js`
(`before_send` scrubbing), `apps/mobile/components/PrivateView.jsx` (replay mask).
Tests: `lib/analytics.test.js`, `lib/analyticsInstrumentation.test.js`.

## Who sends

Analytics sends only when **all** of these hold (`analyticsEnabled`):

- not a development build (`__DEV__` false);
- `EXPO_PUBLIC_ANALYTICS_ENABLED=true` and a PostHog key are set;
- `EXPO_PUBLIC_ANALYTICS_ENVIRONMENT` is `production` or `test` (anything else is `internal` and sends nothing);
- it runs on a real device, unless the environment is `test`.

Only the `production` EAS profile sets `ENABLED=true` + `ENVIRONMENT=production`. `production-acceptance-android`
inherits the environment but sets `ENABLED=false`. QA, preview, simulator and development profiles send nothing.
OTA updates (`scripts/mobile-update.mjs`) apply the same profile env, so `eas update` keeps the same setting.
An isolated test build sets `ENVIRONMENT=test` and its own host/key; every event then carries `app_environment: test`.

Staff using a store build on their own phone are still counted: the app has no analytics opt-out (unchanged,
pending a decision by Grant).

## Every event carries

`surface: app`, `app_environment` (`production`/`test`), and when expo-updates is on `$expo_update_id`,
`$expo_runtime_version`, `$expo_channel`, `$expo_is_embedded_launch`. These `$expo_*` keys are the ones the SDK puts on
exceptions, so exceptions don't get a second copy. The SDK adds `$app_version`, `$app_build`, `$app_namespace`,
`$os_name`, `$os_version` and `$is_emulator` itself. `personProfiles: 'never'` and no `identify` call.

## Events

Existing website-compatible events (names and fields match `apps/web/lib/website-analytics.ts`):

| Event | Properties |
| --- | --- |
| `participation_step` | `action` report/fund/clean, `stage` (website list) |
| `participation_failure` | `action`, `stage`, `reason` (website list) |
| `payout_setup` | `stage` opened/form_opened/already_ready/ready/start_failed |
| `app_sign_in` | `stage` shown/submitted/verification_sent/succeeded/**closed**, `intent`, `method` |
| `first_run` | `stage`, `step` |
| `$screen` | route name |

Stage meanings that changed in this pass:

- Fund: `payment_form` = the person agreed to the total; `payment_ready` = Stripe's payment sheet is on screen;
  `payment_submitted` = the sheet returned anything other than "Canceled" (previously sent before the sheet opened, so
  cancelled sheets counted as submissions); `payment_confirmed` = Stripe reports the payment succeeded.
- Failures added: `payment_start_failed`, `payment_form_failed`, `payment_confirmation_unavailable` when the
  confirmation check throws; report `photo_prepare_failed` / `photo_upload_failed` / `publication_unconfirmed` for
  thrown upload errors (previously not recorded); cleanup evidence names the photo step when it fails.
- Clean: `payout_setup` when a claim is redirected to payout setup.
- Sign-in: `verification_sent` after an email sign-up (was never sent); `closed` when the sign-in screen goes away
  without signing in (ignored after success or while an emailed link is pending), mirrored as `auth_closed`.
- Cleanup claimed (`claim_confirmed`), evidence submitted (`evidence_submitted`) and approved (`cleanup_approved`) stay
  separate events.

New events:

| Event | When | Properties |
| --- | --- | --- |
| `cleanup_approved` | the reviewer's approval returns status `completed` (once per cleanup) | `stage: approved` |
| `map_discovery` | search, results, filters (below) | `stage` + fixed fields |
| `app_timing` | timers (below) | `metric`, `outcome`, `elapsed_ms`, `backgrounded`, metric fields |
| `app_open_target` | shared report link / notification opens | `stage`, `source`, `destination`, `elapsed_ms` |

Approvals made on the website, by an admin or automatically after 48 hours are not seen by the app.

### `map_discovery` stages

- Location search (one session = the search screen opening until a place is chosen or it closes; each stage at most
  once per session): `location_search_started`, `location_suggestions_shown` (`result_bucket`), `location_search_empty`,
  `location_search_failed`, `location_selected` (`place_kind` city/address, `result_bucket`, `had_empty`),
  `location_search_closed` (`had_empty`), `search_cleared`. `surface: toolbar_search`.
- Map results, only after a change in what the person looks for (`trigger` launch/filter/search/search_cleared):
  `results_loaded` / `results_empty` (`result_bucket` of matching reports in view, `filtered`, `truncated`),
  `results_failed`. Loads after a map move or the 30 s refresh (`trigger: map_update`) send nothing themselves.
- `empty_recovered`: the first load with results after an empty result, whatever caused it (`trigger`, `elapsed_ms`
  since the empty result, `result_bucket`).
- `filter_changed`: one per changed filter, `filter` status/funding/severity/radius/visibility/favoritesOnly/query,
  `value` the chosen fixed option (query only `set`/`cleared`), `source` sheet/chip/empty_state.

Result buckets: `0`, `1`, `2-5`, `6-20`, `21+` (same as the website). Never search text, place names, coordinates or IDs.

### `app_timing` metrics

Durations are rounded to 100 ms and capped at 120 000 ms. `backgrounded: true` if the app went to the background
during the span. Each timer sends once.

| metric | starts | ends (`outcome`) | fields |
| --- | --- | --- | --- |
| `launch_to_map` | first app JavaScript evaluated (after the native process and bundle load) | launch logo leaves the map: map view ready **and** starting-area pins loaded (`pins: loaded`) or the 6 s pin wait expired (`pins: timeout`) — `ready` | `map_signal`: `map_loaded` = map's `onMapLoaded` (Google Maps first render), `map_ready_fallback` = `onMapReady` + 4 s wait (Apple Maps never fires `onMapLoaded`). Neither proves all tiles are drawn. Once per process, only when the first screen is the map (a launch through the welcome or sign-in screen is not timed). |
| `report_details` | a report is chosen: preview card/hero tap, list item, shared link or notification (request time, includes the fetch) | sheet open for that report with its first photo link resolved (or no photos) and cleanup status loaded — `ready`; sheet closed first — `closed`; report missing — `unavailable`; fetch error — `failed`; 30 s — `timeout` | `source` preview_card/report_list/report_link/notification/in_app; `photos` ready/none/unavailable (link resolved, pixels not observed) |
| `photo_upload` | photo preparation begins on submit | all photos prepared and uploaded — `ready`; one fails — `failed` | `flow` report/clean, `photo_bucket`, `prepare_ms`, `upload_ms` (summed per photo; two run at a time), `failed_step` prepare/upload |
| `submission` | report: Post tap; clean: Send photos tap; fund: Stripe sheet returns a submitted payment | server/Stripe confirms — `ready`; error — `failed`; not confirmed — `unconfirmed` | `flow` report/clean/fund |

`photo_upload` and `submission` also carry `attempt` (`1`, `2`, `3+`, consecutive failures of the same flow within
30 minutes) and `recovered: true` on a success after a failure.

### `app_open_target`

`requested` when a shared report link (`https://litterbugs.app/reports/…`) or a notification tap arrives; then exactly
one of: `shown` (destination screen visible; for a report, `report_details` ready), `handed_off` (admin inbox opened in
the browser), `unavailable`, `failed`, `closed` (report sheet closed first), `timeout` (30 s), `superseded`.
`destination`: report, map_nearby, cleanup_review, cleanup_feedback, payments, payout_setup, contribution_history,
expired_reports, admin_web. Store-link taps are not app opens; installs and opens are the SDK's own
`Application Installed` / `Application Opened` (with the launch link removed).

## Privacy

- `before_send` (`analyticsPrivacy.js`) removes `url` (the SDK attaches the launch link to `Application Opened`;
  shared links carry report IDs and auth callbacks can carry tokens), `$current_url`, `$referrer`, `$ip`, `$set`,
  `$set_once`, exception steps; scrubs exception messages (emails, links, tokens, UUIDs, keys, coordinates, phone-like
  numbers, long opaque strings; 300 chars max) and drops frame variables/source lines. If scrubbing fails the event is dropped.
- Push tokens are not registered with PostHog and the SDK's notification-open event is off.
- Native crash reports are built by the native SDK and do not pass through `before_send`.

## Session replay

`maskAllTextInputs`, `maskAllImages`, `maskAllSandboxedViews` on; console logs and network URLs off. In the iOS
release test build (PostHog iOS 3.92.7) every piece of text, not only inputs, and every image is drawn as a black
block, so replay shows layout, taps and navigation only.

Replay stops while these screens are in front, and resumes when they close (a manual resume still obeys the
project's replay setting, sampling and triggers):
Auth, SignInMethods, ResetPassword, CompleteProfile, EditProfile, Profile, MyActivity, Payments, PaymentDetail,
ContributionHistory, Settings, SettingsInfo, NotificationSettings, BlockedAccounts, PublicProfile, ReportUser,
FundingContribution (Stripe sheet), PayoutSetup (Stripe Connect), CleanupReview — and **the map itself**.

The map's tiles show street and place names around where the person is, and masking can only black out the whole
map, which blanks everything drawn over it too (and then every frame is identical and dropped). So replay is off
while the map is in front and resumes 0.7 s after report details or the report form (except its map placement
step) cover it; it stops again the moment they close. `PrivateView` still masks report notes/reporter byline, the
completed-cleanup "About the cleanup" card and the small location map on the report review step.

PostHog project requirements: Session replay → "Record user sessions" on (mobile), and Error tracking → "Enable
exception autocapture" on. Replay sampling/minimum duration are set in the project, not the app.

## Crashes and symbols

- JS: uncaught exceptions and unhandled rejections (SDK autocapture); console errors are not captured.
- Native: `nativeCrashes` + `androidNdkCrashes` via `@posthog/react-native-plugin` 2.13.0 (replaces the legacy
  `posthog-react-native-session-replay`, which cannot capture native crashes). Reports are sent on the next launch
  with native frames and debug images (for dSYM symbolication). They carry `$app_version`/`$app_namespace` but not the
  JS-registered `app_environment` or `$expo_*` keys. Crashes before the SDK starts (native start-up, before the first
  JavaScript runs) are not captured. Signals sent from outside the app (`kill`) are not reported.
- Symbols: set `POSTHOG_UPLOAD_SYMBOLS=true` with EAS secrets `POSTHOG_CLI_API_KEY` (personal key with error tracking
  write + organization read), `POSTHOG_CLI_PROJECT_ID` (and `POSTHOG_CLI_HOST` if not US). This adds the
  `posthog-react-native/expo` plugin (`uploadNativeSymbols`, `skipOnConflict`), the Metro debug-ID serializer, and an
  `eas-build-pre-install` step that installs `@posthog/cli@0.19.0`. The config fails the build on the worker if the flag
  is set without the credentials. Credentials are never in the bundle or the repo.
- OTA updates: run `npm run mobile:update:production -- --message "…"` with `POSTHOG_UPLOAD_SYMBOLS=true` and the
  `POSTHOG_CLI_*` values in the shell environment. `eas update` then bundles with debug IDs, and after a successful
  publish `scripts/mobile-update.mjs` uploads the Hermes maps from `apps/mobile/dist` with `@posthog/cli@0.19.0`
  (`--skip-on-conflict`). Without the flag it behaves as before; with the flag but no credentials it stops before
  publishing.

## Privacy disclosures

Draft (not published): "App analytics and diagnostics" section in `apps/web/app/privacy/page.tsx`, and an
App Store / Play Data safety addendum in `docs/reviews/2026-09-11-store-privacy-handoff.md` (product interaction,
crash/performance/diagnostic data, install analytics ID, coarse location from GeoIP unless PostHog discards IPs;
all not linked, no tracking).
