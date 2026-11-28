// Product analytics for the app, sent to the same PostHog project as the
// website so app and web funnels line up. Off in development, QA and
// simulator builds: only the store "production" EAS profile turns it on
// (EXPO_PUBLIC_ANALYTICS_ENABLED with EXPO_PUBLIC_ANALYTICS_ENVIRONMENT=production),
// so QA builds are not counted (staff on store builds still are). An isolated test build uses
// environment "test", which every event carries as `app_environment`.
//
// Event names and fields match apps/web/lib/website-analytics.ts where the website
// has them. Only fixed categories, buckets and rounded durations are sent: never
// report text, photos, names, emails, coordinates, search text or record IDs.
// Every call is synchronous, wrapped in try/catch and never awaited, so
// measurement cannot delay navigation, saves, uploads or payments.

import { scrubAnalyticsEvent } from './analyticsPrivacy';

let client = null;
let config = null;
let startupPromise = null;
let starting = false;
let collectionAllowed = true;
const earlyEvents = [];
const COLLECTION_KEY = '@litterbugs/analytics-enabled';
let testPreferenceStorage = null;
function preferenceStorage() { return testPreferenceStorage ?? require('@react-native-async-storage/async-storage').default; }

export async function analyticsCollectionEnabled() {
  const value = await preferenceStorage().getItem(COLLECTION_KEY);
  return value !== 'false';
}

// Device-wide, independent of sign-in: staff can exclude a store build before
// testing. The SDK's own opt-out also stops native replay and crash collection.
export async function setAnalyticsCollectionEnabled(enabled) {
  if (typeof enabled !== 'boolean') throw new Error('Choose on or off.');
  collectionAllowed = enabled;
  if (!enabled) {
    earlyEvents.length = 0;
    clearTimeout(coverTimer);
    coverTimer = null;
    replayPaused = true;
    const stopped = client?.stopSessionRecording?.();
    const optedOut = client?.optOut?.();
    await Promise.all([stopped, optedOut, preferenceStorage().setItem(COLLECTION_KEY, 'false')]);
  } else {
    await preferenceStorage().setItem(COLLECTION_KEY, 'true');
    await startAnalytics();
    // A previous opt-out is also persisted inside the SDK.
    await client?.optIn?.();
    replayPaused = true;
    updateReplayForScreen();
  }
}
// Read lazily so importing this file never loads native modules (tests, early startup).
function analyticsConfig() {
  if (!config) {
    try { config = require('expo-constants').default?.expoConfig?.extra?.analytics ?? {}; } catch { config = {}; }
  }
  return config;
}

const ENVIRONMENTS = ['production', 'test'];
function runningOnSimulator() {
  try { return require('expo-device').isDevice === false; } catch { return false; }
}

export function analyticsEnabled(options = {}) {
  const settings = options.config ?? analyticsConfig();
  const dev = options.dev ?? (typeof __DEV__ !== 'undefined' && __DEV__);
  if (dev || settings.enabled !== true || typeof settings.posthogKey !== 'string' || !settings.posthogKey) return false;
  if (!ENVIRONMENTS.includes(settings.environment)) return false;
  // Simulators and emulators never count as visitors. Only an explicitly isolated test
  // build may send from one, and its events are labelled app_environment: test.
  const simulator = options.simulator ?? runningOnSimulator();
  return !simulator || settings.environment === 'test';
}

// Which build and which over-the-air update produced an event. The SDK already adds
// $app_version, $app_build, $app_namespace, $os_name, $os_version and $is_emulator to
// every event, and the $expo_* keys only to exceptions; registering the same $expo_*
// keys here makes them available on every event without a second copy.
export function releaseProperties(settings = analyticsConfig(), updates = null) {
  const properties = { surface: 'app', app_environment: ENVIRONMENTS.includes(settings.environment) ? settings.environment : 'internal' };
  try {
    const module = updates ?? require('expo-updates');
    if (module?.isEnabled !== true) return properties;
    const known = value => typeof value === 'string' && value && value !== 'unknown';
    if (known(module.updateId)) properties.$expo_update_id = module.updateId;
    if (known(module.runtimeVersion)) properties.$expo_runtime_version = module.runtimeVersion;
    if (known(module.channel)) properties.$expo_channel = module.channel;
    if (typeof module.isEmbeddedLaunch === 'boolean') properties.$expo_is_embedded_launch = module.isEmbeddedLaunch;
  } catch { /* Release metadata is optional. */ }
  return properties;
}

// Bounded delivery: at most 200 events wait on the phone (oldest dropped first), sent in
// batches of 50 with three retries. Offline events wait in that queue; nothing retries forever.
export const DELIVERY_OPTIONS = Object.freeze({ flushAt: 20, flushInterval: 10000, maxBatchSize: 50, maxQueueSize: 200, fetchRetryCount: 3, requestTimeout: 10000 });

export function posthogOptions(settings = analyticsConfig(), updates = null) {
  return {
    host: settings.posthogHost || 'https://us.i.posthog.com',
    // The SDK can emit installation/open events inside its constructor, before
    // register() runs. Attribute those events at construction time too.
    customAppProperties: properties => ({ ...properties, ...releaseProperties(settings, updates) }),
    personProfiles: 'never',
    captureAppLifecycleEvents: true,
    ...DELIVERY_OPTIONS,
    // Push tokens and notification opens stay out of analytics; the app records
    // notification opens itself, with the destination that actually appeared.
    capturePushNotificationSubscriptions: false,
    capturePushNotificationOpened: false,
    before_send: scrubAnalyticsEvent,
    // Navigation must establish a safe screen before the recorder can start. Auto-start
    // can otherwise capture a restored private screen before onReady pauses it.
    enableSessionReplay: false,
    sessionReplayConfig: {
      maskAllTextInputs: true,
      maskAllImages: true,
      maskAllSandboxedViews: true,
      // Console lines and network URLs can carry IDs, signed photo links and error text.
      captureLog: false,
      captureNetworkTelemetry: false,
    },
    errorTracking: {
      autocapture: { uncaughtExceptions: true, unhandledRejections: true, nativeCrashes: true, androidNdkCrashes: true, console: false },
      exceptionSteps: { enabled: false },
    },
  };
}

let backgroundEpoch = 0;
export function startAnalytics() {
  if (client || !analyticsEnabled()) return client;
  if (startupPromise) return startupPromise;
  starting = true;
  startupPromise = (async () => {
    try {
      // Resolve the device preference before even constructing the SDK, so a
      // relaunch after opt-out cannot send an install/open or start native capture.
      const enabled = await analyticsCollectionEnabled();
      if (!enabled || !collectionAllowed) { collectionAllowed = false; return null; }
      const settings = analyticsConfig();
      // Loaded lazily so builds without analytics never touch the native module.
      const module = require('posthog-react-native');
      const PostHog = module.PostHog ?? module.default;
      client = new PostHog(settings.posthogKey, posthogOptions(settings));
      client.register(releaseProperties(settings));
      require('react-native').AppState.addEventListener('change', (state) => { if (state === 'background') backgroundEpoch += 1; });
      for (const [event, properties] of earlyEvents.splice(0)) send(event, properties);
      updateReplayForScreen();
      return client;
    } catch {
      client = null; // A failed preference read also fails closed.
      return null;
    } finally { starting = false; startupPromise = null; earlyEvents.length = 0; }
  })();
  return startupPromise;
}

function send(event, properties) {
  if (!properties || !collectionAllowed) return false;
  if (!client) {
    if (!starting) return false;
    if (earlyEvents.length >= 50) earlyEvents.shift();
    earlyEvents.push([event, properties]);
    return true;
  }
  try {
    if (event === '$screen') client.screen(properties.$screen_name);
    else client.capture(event, properties);
    return true;
  } catch { return false; }
}

// ---------------------------------------------------------------------------
// Session replay privacy. Replay stops (no frames recorded) while any of these
// screens is in front, because they show sign-in, payment, payout or personal
// account details that masking alone cannot be guaranteed to hide. Stripe's
// payment and payout sheets open over FundingContribution and PayoutSetup.
export const PRIVATE_REPLAY_SCREENS = Object.freeze([
  'Auth', 'SignInMethods', 'ResetPassword', 'CompleteProfile', 'EditProfile',
  'Profile', 'MyActivity', 'Payments', 'PaymentDetail', 'ContributionHistory', 'Settings', 'SettingsInfo',
  'NotificationSettings', 'EmailPreferences', 'BlockedAccounts', 'PublicProfile', 'ReportUser',
  'FundingContribution', 'PayoutSetup', 'CleanupReview', 'CleanupFeedback',
  'CleanupSubmission', 'Updates', 'ExpiredReports',
]);
// The map shows street and place names around where the person is, and replay masking
// can only black out the whole map (which blanks everything drawn over it). So replay
// also stops while the map itself is in front, and resumes while a full-screen sheet
// (report details, report form) covers it.
let mapCovered = false;
export const replayAllowedOn = (name, covered = mapCovered) => typeof name === 'string'
  && !PRIVATE_REPLAY_SCREENS.includes(name) && (name !== 'Map' || covered);
let replayPaused = true;
let currentScreen = null;
function updateReplayForScreen(name = currentScreen) {
  const pause = !replayAllowedOn(name);
  if (!client || !collectionAllowed || pause === replayPaused) return;
  replayPaused = pause;
  try {
    // A resume never forces recording: the native SDK still applies the project's
    // replay setting, sampling and triggers to a manual start.
    const result = pause ? client.stopSessionRecording?.() : client.startSessionRecording?.(true);
    result?.catch?.(() => {});
  } catch { /* optional */ }
}
// Called by the map with whether a full-screen sheet covers it. Covering waits for the
// sheet's slide-in to finish so no frame catches the map mid-animation; uncovering is immediate.
let coverTimer = null;
export function setMapCoveredForReplay(covered, { delayMs = 700 } = {}) {
  clearTimeout(coverTimer);
  coverTimer = null;
  if (!covered) { mapCovered = false; updateReplayForScreen(); return; }
  if (mapCovered) return;
  coverTimer = setTimeout(() => { coverTimer = null; mapCovered = true; updateReplayForScreen(); }, delayMs);
}

let lastScreen = null;
let firstScreen = null;
export function trackScreen(name) {
  if (!name) return;
  noteAppOpenScreen(name);
  firstScreen ??= name;
  currentScreen = name;
  updateReplayForScreen(name);
  if (name !== lastScreen && send('$screen', { $screen_name: name })) lastScreen = name;
}

// Same steps and failure reasons as the website (apps/web/lib/website-analytics.ts),
// so app and web participation funnels can be read together.
const COMMON_STAGES = ['action_tapped', 'auth_shown', 'auth_submitted', 'auth_succeeded', 'verification_sent', 'auth_closed'];
const PARTICIPATION_STAGES = {
  report: ['location_picker', 'location_confirmed', 'photos', 'litter_type', 'severity', 'details', 'review', 'published'],
  fund: ['amount_review', 'payment_form', 'payment_ready', 'payment_submitted', 'payment_confirmed'],
  clean: ['payout_check', 'payout_setup', 'payout_ready', 'safety_review', 'claim_confirmed', 'evidence_form', 'evidence_submitted'],
};
const FAILURE_REASONS = {
  report: ['location_denied', 'location_timeout', 'location_unavailable', 'location_stale', 'location_out_of_range', 'photo_prepare_failed', 'photo_upload_failed', 'draft_save_failed', 'publication_unconfirmed'],
  fund: ['payment_quote_failed', 'payment_start_failed', 'payment_form_failed', 'payment_rejected', 'payment_confirmation_unavailable'],
  clean: ['payout_status_load_failed', 'safety_load_failed', 'safety_save_failed', 'claim_failed', 'photo_prepare_failed', 'photo_upload_failed', 'draft_save_failed', 'evidence_check_failed', 'evidence_submit_unconfirmed'],
};
const validStage = (action, stage) => Boolean(PARTICIPATION_STAGES[action]) && (COMMON_STAGES.includes(stage) || PARTICIPATION_STAGES[action].includes(stage));

// Report wizard step index → website stage name.
export const REPORT_STEP_STAGES = ['photos', 'litter_type', 'severity', 'details', 'review'];

export function participationProperties(action, stage) {
  return validStage(action, stage) ? { action, stage } : null;
}

export function participationFailureProperties(action, stage, reason) {
  const step = participationProperties(action, stage);
  return step && FAILURE_REASONS[action]?.includes(reason) ? { ...step, reason } : null;
}

export function trackParticipation(action, stage) {
  send('participation_step', participationProperties(action, stage));
}

export function trackParticipationFailure(action, stage, reason) {
  send('participation_failure', participationFailureProperties(action, stage, reason));
}

// Payout setup, with the website's stage names (apps/web/lib/website-analytics.ts, PAYOUT_STAGES).
const PAYOUT_STAGES = ['opened', 'form_opened', 'already_ready', 'ready', 'start_failed'];
export const payoutSetupProperties = stage => (PAYOUT_STAGES.includes(stage) ? { stage } : null);
export function trackPayoutSetup(stage) {
  send('payout_setup', payoutSetupProperties(stage));
}

// Signing in from the app. `intent` is what the person was trying to do when asked
// (report, fund, clean) or 'none' when they chose to sign in themselves.
const SIGN_IN_STAGES = ['shown', 'submitted', 'verification_sent', 'succeeded', 'closed'];
const SIGN_IN_METHODS = ['email_login', 'email_signup', 'apple', 'google', 'facebook'];
const SIGN_IN_INTENTS = ['report', 'fund', 'clean', 'none'];
export function signInProperties(stage, { intent = 'none', method } = {}) {
  if (!SIGN_IN_STAGES.includes(stage) || !SIGN_IN_INTENTS.includes(intent)) return null;
  return SIGN_IN_METHODS.includes(method) ? { stage, intent, method } : { stage, intent };
}
// The sign-in screen says why it opened; later stages reuse that reason. "Succeeded" only
// counts after the screen was shown, so restoring a saved session at launch is not a sign-in.
// "Closed" means the screen went away without a sign-in; either ends the attempt, so one
// attempt has at most one outcome.
let signInIntent = null;
let signInLinkSent = false;
export function trackSignIn(stage, details = {}) {
  if (stage === 'shown') { signInIntent = details.intent || 'none'; signInLinkSent = false; }
  else if (signInIntent === null || (stage === 'closed' && signInLinkSent)) return;
  if (stage === 'verification_sent') signInLinkSent = true;
  const properties = signInProperties(stage, { ...details, intent: signInIntent });
  if (stage === 'succeeded' || stage === 'closed') signInIntent = null;
  if (!properties || !send('app_sign_in', properties)) return;
  // Also a step in that action's funnel, so app and web sign-in drop-off line up.
  const step = { shown: 'auth_shown', submitted: 'auth_submitted', verification_sent: 'verification_sent', succeeded: 'auth_succeeded', closed: 'auth_closed' }[stage];
  if (properties.intent !== 'none') trackParticipation(properties.intent, step);
}

// The welcome screen and the map tour.
const FIRST_RUN_STAGES = ['welcome_shown', 'welcome_get_started', 'welcome_sign_in', 'tour_started', 'tour_replayed', 'tour_step', 'tour_finished', 'tour_skipped'];
const TOUR_STEP_KEYS = ['report', 'spot', 'fund', 'clean'];
export function firstRunProperties(stage, step) {
  if (!FIRST_RUN_STAGES.includes(stage)) return null;
  if (stage !== 'tour_step' && stage !== 'tour_skipped') return { stage };
  return TOUR_STEP_KEYS.includes(step) ? { stage, step } : null;
}
export function trackFirstRun(stage, step) {
  send('first_run', firstRunProperties(stage, step));
}

// A cleanup approved by its reviewer in the app (the website sends the same event name).
// The cleanup ID is only a local duplicate check and is never sent. Approvals made on the
// website, by an admin or automatically after the review window are not seen here.
const approvedCleanups = new Set();
export function trackCleanupApproved(cleanupId) {
  if (!cleanupId || approvedCleanups.has(cleanupId)) return;
  if (approvedCleanups.size >= 50) approvedCleanups.clear();
  approvedCleanups.add(cleanupId);
  send('cleanup_approved', { stage: 'approved' });
}

// ---------------------------------------------------------------------------
// Buckets shared with the website (RESULT_BUCKETS) and fixed duration rounding.
export function resultBucket(count) {
  const n = Number(count);
  if (!Number.isFinite(n) || n <= 0) return '0';
  return n === 1 ? '1' : n <= 5 ? '2-5' : n <= 20 ? '6-20' : '21+';
}
// Durations: rounded to 100 ms and capped at two minutes, as the website's map_loading.
export function roundedDuration(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.min(120000, Math.round(n / 100) * 100);
}

let clock = () => (globalThis.performance?.now ? globalThis.performance.now() : Date.now());
const LAUNCH_STARTED_AT = clock();

// ---------------------------------------------------------------------------
// Timings (`app_timing`). Each timer finishes exactly once; later finishes are ignored.
//   launch_to_map   start: this file is first evaluated (the app's first JavaScript, after the
//                   native process and bundle have loaded). end: the launch logo leaves the map
//                   because the map view reported ready and the starting area's pins finished
//                   loading (pins: loaded) or the 6 s pin wait ran out (pins: timeout).
//                   map_signal says what "ready" rests on: map_loaded = the map's onMapLoaded
//                   (Google Maps: first render finished); map_ready_fallback = onMapReady plus
//                   the 4 s wait used where onMapLoaded never fires (Apple Maps). Neither proves
//                   every tile is drawn. Sent once per app process, only when the first screen is the map.
//   report_details  start: a report is chosen (card/preview tap, a list item, a shared link or a
//                   notification asking for it). end: the details sheet is open for that report
//                   with its first photo link resolved (or no photos) and its cleanup status
//                   loaded (outcome ready), or the sheet closes first (closed), the report is
//                   unavailable or fails to load, or 30 s pass (timeout). Photo pixels are not
//                   observed: photos: ready means the link resolved.
//   photo_upload    start: photo preparation begins on submit. end: every photo is prepared and
//                   uploaded (ready) or one fails (failed). prepare_ms / upload_ms are the summed
//                   per-photo time in each step (photos are processed two at a time).
//   submission      start: the final submit tap (Post report, Send photos) or, for funding, the
//                   payment form returning the person's submitted payment. end: the server or
//                   Stripe confirms (ready), it fails (failed) or is still unconfirmed.
const TIMING_METRICS = {
  launch_to_map: { outcomes: ['ready'], dimensions: { map_signal: ['map_loaded', 'map_ready_fallback'], pins: ['loaded', 'timeout'] } },
  report_details: { outcomes: ['ready', 'closed', 'unavailable', 'failed', 'timeout'], dimensions: { source: ['preview_card', 'report_list', 'report_link', 'notification', 'in_app'], photos: ['ready', 'none', 'unavailable'] } },
  photo_upload: { outcomes: ['ready', 'failed'], dimensions: { flow: ['report', 'clean'], photo_bucket: ['1', '2-5', '6-20', '21+'], failed_step: ['prepare', 'upload'] }, durations: ['prepare_ms', 'upload_ms'] },
  submission: { outcomes: ['ready', 'failed', 'unconfirmed'], dimensions: { flow: ['report', 'clean', 'fund'] } },
};

// Consecutive failures of the same operation, so a later success is counted as a recovery
// after N attempts. Forgotten after 30 minutes or on success.
const failureStreaks = new Map();
const attemptBucket = n => (n >= 3 ? '3+' : String(n));

export function timingProperties(metric, outcome, elapsedMs, extra = {}) {
  const definition = TIMING_METRICS[metric];
  const elapsed_ms = roundedDuration(elapsedMs);
  if (!definition || !definition.outcomes.includes(outcome) || elapsed_ms === null) return null;
  const properties = { metric, outcome, elapsed_ms, backgrounded: extra.backgrounded === true };
  for (const [key, allowed] of Object.entries(definition.dimensions)) {
    if (allowed.includes(extra[key])) properties[key] = extra[key];
  }
  for (const key of definition.durations ?? []) {
    const value = roundedDuration(extra[key]);
    if (value !== null && extra[key] !== undefined) properties[key] = value;
  }
  if (['1', '2', '3+'].includes(extra.attempt)) properties.attempt = extra.attempt;
  if (typeof extra.recovered === 'boolean') properties.recovered = extra.recovered;
  return properties;
}

const openTimers = new Set();
export function startTiming(metric, dimensions = {}, { timeoutMs } = {}) {
  const startedAt = clock();
  const epoch = backgroundEpoch;
  let done = false;
  let timeout = null;
  const streakKey = `${metric}:${dimensions.flow ?? ''}`;
  const timer = {
    dimensions: { ...dimensions },
    get active() { return !done; },
    // Returns the properties sent (null when nothing was sent), mostly for tests.
    finish(outcome, extra = {}) {
      if (done) return null;
      done = true;
      openTimers.delete(timer);
      if (timeout) clearTimeout(timeout);
      const retried = metric === 'photo_upload' || metric === 'submission';
      let attempt = {};
      if (retried) {
        const streak = failureStreaks.get(streakKey);
        const previous = streak && clock() - streak.at < 30 * 60 * 1000 ? streak.count : 0;
        attempt = { attempt: attemptBucket(previous + 1), recovered: outcome === 'ready' && previous > 0 };
        if (outcome === 'ready') failureStreaks.delete(streakKey);
        else if (outcome === 'failed') failureStreaks.set(streakKey, { count: previous + 1, at: clock() });
      }
      const properties = timingProperties(metric, outcome, clock() - startedAt, {
        ...timer.dimensions, ...extra, ...attempt, backgrounded: backgroundEpoch !== epoch,
      });
      return send('app_timing', properties) ? properties : null;
    },
    cancel() { if (!done) { done = true; openTimers.delete(timer); if (timeout) clearTimeout(timeout); } },
  };
  // Keep the number of unfinished timers small; the oldest is dropped without sending.
  if (openTimers.size >= 20) openTimers.values().next().value.cancel();
  openTimers.add(timer);
  if (timeoutMs) timeout = setTimeout(() => timer.finish('timeout'), timeoutMs);
  return timer;
}

let launchTracked = false;
// Only launches that open straight onto the map: after the welcome screen or sign-in, the
// time would mostly measure the person reading, not the app starting.
export function trackLaunchToMap({ mapSignal, pins }) {
  if (launchTracked) return null;
  launchTracked = true;
  if (firstScreen !== null && firstScreen !== 'Map') return null;
  const properties = timingProperties('launch_to_map', 'ready', clock() - LAUNCH_STARTED_AT, { map_signal: mapSignal, pins, backgrounded: backgroundEpoch > 0 });
  return send('app_timing', properties) ? properties : null;
}

// Times photo preparation and upload separately inside a batch upload.
export function photoUploadTimer(flow, photoCount) {
  const timer = startTiming('photo_upload', { flow, photo_bucket: resultBucket(photoCount) });
  let prepare = 0;
  let upload = 0;
  let failedStep = null;
  const measure = async (step, work) => {
    const started = clock();
    try { return await work(); }
    catch (error) { failedStep = failedStep ?? step; throw error; }
    finally { if (step === 'prepare') prepare += clock() - started; else upload += clock() - started; }
  };
  return {
    prepare: work => measure('prepare', work),
    upload: work => measure('upload', work),
    get failedStep() { return failedStep; },
    finish: outcome => timer.finish(outcome, { prepare_ms: prepare, upload_ms: upload, ...(failedStep ? { failed_step: failedStep } : {}) }),
  };
}

// ---------------------------------------------------------------------------
// Map discovery (`map_discovery`), website stage names plus app-only stages.
// Search text, places, coordinates and report IDs are never sent.
const DISCOVERY_STAGES = [
  'location_search_started', 'location_suggestions_shown', 'location_search_empty', 'location_search_failed', 'location_selected',
  'location_search_closed', 'search_cleared',
  'results_loaded', 'results_empty', 'results_failed', 'empty_recovered', 'filter_changed',
];
const FILTER_VALUES = {
  status: ['all', 'available', 'progress', 'completed'],
  funding: ['all', 'funded', 'volunteer'],
  severity: ['all', 'low', 'medium', 'high'],
  radius: ['0', '5', '25', '50'],
  visibility: ['visible', 'hidden'],
  favoritesOnly: ['true', 'false'],
  query: ['set', 'cleared'],
};
const DISCOVERY_FIELDS = {
  surface: ['toolbar_search'],
  result_bucket: ['0', '1', '2-5', '6-20', '21+'],
  place_kind: ['city', 'address'],
  trigger: ['launch', 'filter', 'search', 'search_cleared', 'map_update'],
  source: ['sheet', 'chip', 'empty_state'],
};
export function discoveryProperties(stage, details = {}) {
  if (!DISCOVERY_STAGES.includes(stage)) return null;
  const properties = { stage };
  for (const [key, allowed] of Object.entries(DISCOVERY_FIELDS)) if (allowed.includes(details[key])) properties[key] = details[key];
  for (const key of ['filtered', 'truncated', 'had_empty']) if (typeof details[key] === 'boolean') properties[key] = details[key];
  if (stage === 'filter_changed') {
    const allowed = FILTER_VALUES[details.filter];
    const value = String(details.value);
    if (!allowed || !allowed.includes(value)) return null;
    properties.filter = details.filter;
    properties.value = value;
  }
  if (stage === 'empty_recovered') {
    const elapsed = roundedDuration(details.elapsed_ms);
    if (elapsed !== null) properties.elapsed_ms = elapsed;
  }
  return properties;
}
export function trackMapDiscovery(stage, details) {
  send('map_discovery', discoveryProperties(stage, details));
}
export function filterChangeValue(key, value) {
  if (key === 'query') return String(value ?? '').trim() ? 'set' : 'cleared';
  return String(value);
}
// One event per filter that differs, with the chosen category (search text only as set/cleared).
export function trackFilterChanges(before = {}, after = {}, source) {
  for (const key of Object.keys(FILTER_VALUES)) {
    if (before[key] !== after[key]) trackMapDiscovery('filter_changed', { filter: key, value: filterChangeValue(key, after[key]), source });
  }
}

// One location-search session: the search screen opening until a place is chosen or the
// screen closes. Each outcome is sent at most once per session.
export function locationSearchSession() {
  const sent = new Set();
  let hadEmpty = false;
  let finished = false;
  const once = (stage, details) => {
    if (finished || sent.has(stage)) return;
    sent.add(stage);
    trackMapDiscovery(stage, { surface: 'toolbar_search', ...details });
  };
  return {
    started: () => once('location_search_started'),
    results: (count) => {
      if (count > 0) once('location_suggestions_shown', { result_bucket: resultBucket(count) });
      else { hadEmpty = true; once('location_search_empty', { result_bucket: '0' }); }
    },
    failed: () => once('location_search_failed'),
    selected: (placeKind, count) => { once('location_selected', { place_kind: placeKind, result_bucket: resultBucket(count), had_empty: hadEmpty }); finished = true; },
    closed: () => { if (sent.has('location_search_started')) once('location_search_closed', { had_empty: hadEmpty }); finished = true; },
  };
}

// Map results after a change in what the person is looking for (trigger launch, filter,
// search, search_cleared). Loads after a map move or the 30 s refresh (trigger map_update)
// send nothing themselves; they only count as recovery from an empty result.
export function discoveryOutcomeTracker() {
  let emptySince = null;
  return {
    loaded({ trigger, count, failed = false, filtered = false, truncated = false }) {
      if (failed) {
        if (trigger !== 'map_update') trackMapDiscovery('results_failed', { trigger, filtered });
        return;
      }
      if (count > 0 && emptySince !== null) {
        trackMapDiscovery('empty_recovered', { trigger, filtered, result_bucket: resultBucket(count), elapsed_ms: clock() - emptySince });
        emptySince = null;
      }
      if (trigger === 'map_update') return;
      trackMapDiscovery(count > 0 ? 'results_loaded' : 'results_empty', { trigger, filtered, truncated, result_bucket: resultBucket(count) });
      if (count === 0 && emptySince === null) emptySince = clock();
    },
  };
}

// ---------------------------------------------------------------------------
// Opening the app from a shared report link or a notification (`app_open_target`).
// "requested" is the link or tap arriving; "shown" only once the intended destination is on
// screen (for a report: report_details ready). Installs and plain opens are the SDK's own
// Application Installed / Application Opened events, without the link.
const OPEN_SOURCES = ['report_link', 'notification'];
const OPEN_DESTINATIONS = ['report', 'map_nearby', 'cleanup_review', 'cleanup_feedback', 'payments', 'payout_setup', 'contribution_history', 'expired_reports', 'admin_web'];
const OPEN_STAGES = ['requested', 'shown', 'handed_off', 'unavailable', 'failed', 'closed', 'timeout', 'superseded'];
const DESTINATION_SCREENS = { map_nearby: 'Map', cleanup_review: 'CleanupReview', cleanup_feedback: 'CleanupFeedback', payments: 'Payments', payout_setup: 'PayoutSetup', contribution_history: 'ContributionHistory', expired_reports: 'ExpiredReports' };
export function appOpenProperties(stage, source, destination, elapsedMs) {
  if (!OPEN_STAGES.includes(stage) || !OPEN_SOURCES.includes(source) || !OPEN_DESTINATIONS.includes(destination)) return null;
  const properties = { stage, source, destination };
  if (stage !== 'requested') {
    const elapsed = roundedDuration(elapsedMs);
    if (elapsed !== null) properties.elapsed_ms = elapsed;
  }
  return properties;
}
let pendingOpen = null;
export function beginAppOpen(source, destination) {
  if (!appOpenProperties('requested', source, destination)) return;
  if (pendingOpen) finishAppOpen('superseded');
  const open = { source, destination, startedAt: clock(), timeout: setTimeout(() => { if (pendingOpen === open) finishAppOpen('timeout'); }, 30000) };
  pendingOpen = open;
  send('app_open_target', appOpenProperties('requested', source, destination));
}
export function finishAppOpen(stage, destination) {
  const open = pendingOpen;
  if (!open || (destination && destination !== open.destination)) return;
  pendingOpen = null;
  clearTimeout(open.timeout);
  send('app_open_target', appOpenProperties(stage, open.source, open.destination, clock() - open.startedAt));
}
// Where the pending open came from, if it is for this destination ('report_link', 'notification').
export const pendingAppOpenSource = destination => (pendingOpen?.destination === destination ? pendingOpen.source : null);
function noteAppOpenScreen(name) {
  if (pendingOpen && DESTINATION_SCREENS[pendingOpen.destination] === name) finishAppOpen('shown');
}
export function notificationDestinationKey(destination) {
  if (!destination) return null;
  if (destination.url) return 'admin_web';
  if (destination.name === 'App') return destination.params?.params?.showNearby ? 'map_nearby' : destination.params?.params?.reportId ? 'report' : null;
  return Object.entries(DESTINATION_SCREENS).find(([, screen]) => screen === destination.name)?.[0] ?? null;
}
export function isSharedReportLink(url) {
  return typeof url === 'string' && /^(?:https:\/\/(?:www\.)?litterbugs\.app|litterbugs:\/)\/reports\/[^/?#]+/i.test(url);
}

// Test hooks.
export function __resetAnalyticsForTests({ testClient = null, testStorage = null, testConfig = null, now } = {}) {
  client = testClient;
  config = testConfig;
  testPreferenceStorage = testStorage;
  startupPromise = null;
  starting = false;
  collectionAllowed = true;
  earlyEvents.length = 0;
  if (now) clock = now;
  lastScreen = null;
  firstScreen = null;
  replayPaused = true;
  currentScreen = null;
  mapCovered = false;
  clearTimeout(coverTimer);
  coverTimer = null;
  signInIntent = null;
  signInLinkSent = false;
  launchTracked = false;
  backgroundEpoch = 0;
  failureStreaks.clear();
  approvedCleanups.clear();
  for (const timer of [...openTimers]) timer.cancel();
  if (pendingOpen) clearTimeout(pendingOpen.timeout);
  pendingOpen = null;
}
export function __markBackgroundedForTests() { backgroundEpoch += 1; }
