import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __markBackgroundedForTests, __resetAnalyticsForTests, analyticsEnabled, appOpenProperties, beginAppOpen,
  discoveryOutcomeTracker, discoveryProperties, filterChangeValue, finishAppOpen, isSharedReportLink,
  locationSearchSession, notificationDestinationKey, pendingAppOpenSource, photoUploadTimer, posthogOptions,
  releaseProperties, replayAllowedOn, resultBucket, roundedDuration, setMapCoveredForReplay, startTiming, timingProperties,
  trackCleanupApproved, trackLaunchToMap, trackMapDiscovery, trackParticipation, trackScreen, trackSignIn,
} from './analytics';
import { scrubAnalyticsEvent, scrubText } from './analyticsPrivacy';

let time = 0;
let client;
const events = () => client.capture.mock.calls.map(([event, properties]) => ({ event, ...properties }));
const named = name => events().filter(({ event }) => event === name);

beforeEach(() => {
  vi.useFakeTimers();
  time = 1000;
  client = {
    capture: vi.fn(), screen: vi.fn(),
    stopSessionRecording: vi.fn(() => Promise.resolve()),
    startSessionRecording: vi.fn(() => Promise.resolve()),
    isSessionReplayActive: vi.fn(() => Promise.resolve(true)),
  };
  __resetAnalyticsForTests({ testClient: client, now: () => time });
});
afterEach(() => { __resetAnalyticsForTests(); vi.useRealTimers(); });

describe('who sends analytics', () => {
  const production = { enabled: true, posthogKey: 'phc_test', environment: 'production' };
  it('sends only from a store or isolated test build on a real device', () => {
    expect(analyticsEnabled({ config: production, dev: false, simulator: false })).toBe(true);
    expect(analyticsEnabled({ config: production, dev: true, simulator: false })).toBe(false);
    expect(analyticsEnabled({ config: { ...production, enabled: false }, dev: false, simulator: false })).toBe(false);
    expect(analyticsEnabled({ config: { ...production, posthogKey: '' }, dev: false, simulator: false })).toBe(false);
    expect(analyticsEnabled({ config: { ...production, environment: 'internal' }, dev: false, simulator: false })).toBe(false);
    expect(analyticsEnabled({ config: { enabled: true, posthogKey: 'phc_test' }, dev: false, simulator: false })).toBe(false);
  });
  it('never counts simulators, except an explicitly labelled test build', () => {
    expect(analyticsEnabled({ config: production, dev: false, simulator: true })).toBe(false);
    expect(analyticsEnabled({ config: { ...production, environment: 'test' }, dev: false, simulator: true })).toBe(true);
  });
});

describe('SDK configuration', () => {
  const options = posthogOptions({ posthogHost: 'https://example.test' });
  it('stays anonymous and keeps push data out', () => {
    expect(options.personProfiles).toBe('never');
    expect(options.capturePushNotificationSubscriptions).toBe(false);
    expect(options.capturePushNotificationOpened).toBe(false);
    expect(options.before_send).toBe(scrubAnalyticsEvent);
  });
  it('masks replay and records no console lines or network URLs', () => {
    expect(options.sessionReplayConfig).toMatchObject({ maskAllTextInputs: true, maskAllImages: true, maskAllSandboxedViews: true, captureLog: false, captureNetworkTelemetry: false });
  });
  it('captures JavaScript and native crashes, without console errors or breadcrumbs', () => {
    expect(options.errorTracking.autocapture).toMatchObject({ uncaughtExceptions: true, unhandledRejections: true, nativeCrashes: true, androidNdkCrashes: true, console: false });
    expect(options.errorTracking.exceptionSteps.enabled).toBe(false);
  });
  it('bounds the offline queue and retries', () => {
    expect(options.maxQueueSize).toBeLessThanOrEqual(200);
    expect(options.maxBatchSize).toBeGreaterThan(options.flushAt);
    expect(options.fetchRetryCount).toBeLessThanOrEqual(3);
  });
});

describe('release attribution', () => {
  it('adds environment and update, and nothing the SDK already sends', () => {
    const properties = releaseProperties({ environment: 'production' }, { isEnabled: true, updateId: 'u-1', runtimeVersion: '2.1.0', channel: 'production', isEmbeddedLaunch: false });
    expect(properties).toEqual({ surface: 'app', app_environment: 'production', $expo_update_id: 'u-1', $expo_runtime_version: '2.1.0', $expo_channel: 'production', $expo_is_embedded_launch: false });
    for (const key of ['$app_version', '$app_build', '$os_name', '$app_namespace']) expect(properties).not.toHaveProperty(key);
  });
  it('skips update details when updates are off or unknown', () => {
    expect(releaseProperties({ environment: 'test' }, { isEnabled: false, updateId: 'x' })).toEqual({ surface: 'app', app_environment: 'test' });
    expect(releaseProperties({}, { isEnabled: true, updateId: 'unknown' })).toEqual({ surface: 'app', app_environment: 'internal', });
  });
});

describe('privacy filter before sending', () => {
  it('drops the launch link the SDK attaches to Application Opened', () => {
    const event = scrubAnalyticsEvent({ event: 'Application Opened', properties: { url: 'https://litterbugs.app/reports/7c9e6679-7425-40de-944b-e07fc1f90ae7', $app_version: '2.1.0' }, $set: { email: 'a@b.co' } });
    expect(event.properties).toEqual({ $app_version: '2.1.0' });
    expect(event).not.toHaveProperty('$set');
  });
  it('scrubs error messages and source context', () => {
    const event = scrubAnalyticsEvent({ event: '$exception', properties: { $exception_list: [{ type: 'Error', value: 'Key (email)=(sam@example.com) at 40.71283,-74.00601 id 7c9e6679-7425-40de-944b-e07fc1f90ae7 https://x.supabase.co/a?token=abc eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTYifQ.sig +1 (555) 010-9999', stacktrace: { frames: [{ filename: 'main.jsbundle', lineno: 1, vars: { password: 'x' }, context_line: 'secret' }] } }] } });
    const [entry] = event.properties.$exception_list;
    expect(entry.value).not.toMatch(/sam@|40\.71|7c9e6679|supabase|eyJ|555/);
    expect(entry.value).toContain('<email>');
    expect(entry.stacktrace.frames[0]).toEqual({ filename: 'main.jsbundle', lineno: 1 });
  });
  it('limits message length and sends nothing if scrubbing fails', () => {
    expect(scrubText('a '.repeat(400)).length).toBeLessThanOrEqual(301);
    const broken = { event: 'x', get properties() { throw new Error('boom'); } };
    expect(scrubAnalyticsEvent(broken)).toBeNull();
  });
});

describe('timings', () => {
  it('rounds durations and buckets counts', () => {
    expect(roundedDuration(1249)).toBe(1200);
    expect(roundedDuration(999999)).toBe(120000);
    expect(roundedDuration(-1)).toBeNull();
    expect([0, 1, 3, 12, 40].map(resultBucket)).toEqual(['0', '1', '2-5', '6-20', '21+']);
  });
  it('accepts only known metrics, outcomes and categories', () => {
    expect(timingProperties('report_details', 'ready', 10, { source: 'report_link', photos: 'ready', reportId: 'r1' })).toEqual({ metric: 'report_details', outcome: 'ready', elapsed_ms: 0, backgrounded: false, source: 'report_link', photos: 'ready' });
    expect(timingProperties('report_details', 'done', 10)).toBeNull();
    expect(timingProperties('unknown', 'ready', 10)).toBeNull();
    expect(timingProperties('report_details', 'ready', 10, { source: 'somewhere' })).not.toHaveProperty('source');
  });
  it('finishes once, so a success is never counted twice', () => {
    const timer = startTiming('report_details', { source: 'preview_card' });
    time += 1530;
    timer.finish('ready', { photos: 'none' });
    timer.finish('ready');
    timer.finish('closed');
    expect(named('app_timing')).toEqual([{ event: 'app_timing', metric: 'report_details', outcome: 'ready', elapsed_ms: 1500, backgrounded: false, source: 'preview_card', photos: 'none' }]);
  });
  it('times out, and notes when the app went to the background', () => {
    startTiming('report_details', { source: 'notification' }, { timeoutMs: 30000 });
    __markBackgroundedForTests();
    time += 30000;
    vi.advanceTimersByTime(30000);
    expect(named('app_timing')[0]).toMatchObject({ outcome: 'timeout', elapsed_ms: 30000, backgrounded: true });
  });
  it('counts attempts and marks a success after failures as a recovery', () => {
    startTiming('submission', { flow: 'report' }).finish('failed');
    startTiming('submission', { flow: 'report' }).finish('failed');
    startTiming('submission', { flow: 'clean' }).finish('ready');
    startTiming('submission', { flow: 'report' }).finish('ready');
    startTiming('submission', { flow: 'report' }).finish('ready');
    expect(named('app_timing').map(({ flow, outcome, attempt, recovered }) => [flow, outcome, attempt, recovered])).toEqual([
      ['report', 'failed', '1', false], ['report', 'failed', '2', false], ['clean', 'ready', '1', false],
      ['report', 'ready', '3+', true], ['report', 'ready', '1', false],
    ]);
  });
  it('cancelled timers send nothing', () => {
    const timer = startTiming('submission', { flow: 'fund' });
    timer.cancel();
    timer.finish('ready');
    expect(named('app_timing')).toEqual([]);
  });
  it('skips launches that start on another screen', () => {
    trackScreen('Home');
    time += 40000;
    expect(trackLaunchToMap({ mapSignal: 'map_loaded', pins: 'loaded' })).toBeNull();
    expect(named('app_timing')).toEqual([]);
  });
  it('measures launch to the usable map once per app process', () => {
    trackScreen('Map');
    time += 2840;
    trackLaunchToMap({ mapSignal: 'map_ready_fallback', pins: 'loaded' });
    trackLaunchToMap({ mapSignal: 'map_loaded', pins: 'loaded' });
    expect(named('app_timing')).toEqual([{ event: 'app_timing', metric: 'launch_to_map', outcome: 'ready', elapsed_ms: expect.any(Number), backgrounded: false, map_signal: 'map_ready_fallback', pins: 'loaded' }]);
  });
  it('separates photo preparation from upload and names the failing step', async () => {
    const timing = photoUploadTimer('clean', 3);
    await timing.prepare(async () => { time += 400; });
    await timing.upload(async () => { time += 1200; });
    await expect(timing.upload(async () => { time += 300; throw new Error('offline'); })).rejects.toThrow('offline');
    expect(timing.failedStep).toBe('upload');
    timing.finish('failed');
    expect(named('app_timing')[0]).toMatchObject({ metric: 'photo_upload', outcome: 'failed', flow: 'clean', photo_bucket: '2-5', prepare_ms: 400, upload_ms: 1500, failed_step: 'upload', elapsed_ms: 1900 });
  });
});

describe('search and filters', () => {
  it('sends each search outcome at most once per search, never the text', () => {
    const session = locationSearchSession();
    session.started(); session.started();
    session.results(0); session.results(0);
    session.results(4); session.results(7);
    session.selected('city', 4);
    session.closed();
    expect(named('map_discovery').map(({ event, ...rest }) => rest)).toEqual([
      { stage: 'location_search_started', surface: 'toolbar_search' },
      { stage: 'location_search_empty', surface: 'toolbar_search', result_bucket: '0' },
      { stage: 'location_suggestions_shown', surface: 'toolbar_search', result_bucket: '2-5' },
      { stage: 'location_selected', surface: 'toolbar_search', place_kind: 'city', result_bucket: '2-5', had_empty: true },
    ]);
  });
  it('records closing a search only when one was started', () => {
    locationSearchSession().closed();
    const session = locationSearchSession();
    session.started(); session.failed(); session.closed();
    expect(named('map_discovery').map(({ stage }) => stage)).toEqual(['location_search_started', 'location_search_failed', 'location_search_closed']);
  });
  it('sends results after a discovery change and recovery from empty', () => {
    const tracker = discoveryOutcomeTracker();
    tracker.loaded({ trigger: 'launch', count: 12 });
    tracker.loaded({ trigger: 'map_update', count: 9 });
    tracker.loaded({ trigger: 'filter', count: 0, filtered: true });
    time += 4000;
    tracker.loaded({ trigger: 'map_update', count: 0, filtered: true });
    time += 2000;
    tracker.loaded({ trigger: 'filter', count: 3, filtered: true });
    tracker.loaded({ trigger: 'search', failed: true });
    tracker.loaded({ trigger: 'map_update', failed: true });
    expect(named('map_discovery').map(({ event, ...rest }) => rest)).toEqual([
      { stage: 'results_loaded', trigger: 'launch', result_bucket: '6-20', filtered: false, truncated: false },
      { stage: 'results_empty', trigger: 'filter', result_bucket: '0', filtered: true, truncated: false },
      { stage: 'empty_recovered', trigger: 'filter', result_bucket: '2-5', filtered: true, elapsed_ms: 6000 },
      { stage: 'results_loaded', trigger: 'filter', result_bucket: '2-5', filtered: true, truncated: false },
      { stage: 'results_failed', trigger: 'search', filtered: false },
    ]);
  });
  it('a map move can also recover from empty results', () => {
    const tracker = discoveryOutcomeTracker();
    tracker.loaded({ trigger: 'search', count: 0, filtered: true });
    tracker.loaded({ trigger: 'map_update', count: 2, filtered: true });
    expect(named('map_discovery').map(({ stage, trigger }) => [stage, trigger])).toEqual([['results_empty', 'search'], ['empty_recovered', 'map_update']]);
  });
  it('filter changes send the chosen category only', () => {
    expect(discoveryProperties('filter_changed', { filter: 'status', value: 'available', source: 'sheet' })).toEqual({ stage: 'filter_changed', filter: 'status', value: 'available', source: 'sheet' });
    expect(discoveryProperties('filter_changed', { filter: 'radius', value: 25 })).toEqual({ stage: 'filter_changed', filter: 'radius', value: '25' });
    expect(filterChangeValue('query', 'bottles near my house')).toBe('set');
    expect(filterChangeValue('query', '  ')).toBe('cleared');
    expect(discoveryProperties('filter_changed', { filter: 'query', value: 'bottles' })).toBeNull();
    expect(discoveryProperties('filter_changed', { filter: 'reportId', value: 'x' })).toBeNull();
    expect(discoveryProperties('search_typed', {})).toBeNull();
    trackMapDiscovery('location_selected', { place_kind: 'city', label: 'Springfield, IL', latitude: 39.78 });
    expect(named('map_discovery')[0]).toEqual({ event: 'map_discovery', stage: 'location_selected', place_kind: 'city' });
  });
});

describe('opening shared links and notifications', () => {
  it('recognises shared report links only', () => {
    expect(isSharedReportLink('https://litterbugs.app/reports/abc')).toBe(true);
    expect(isSharedReportLink('https://www.litterbugs.app/reports/abc?x=1')).toBe(true);
    expect(isSharedReportLink('litterbugs://reports/abc')).toBe(true);
    expect(isSharedReportLink('litterbugs://auth-callback#access_token=x')).toBe(false);
    expect(isSharedReportLink('https://evil.example/reports/abc')).toBe(false);
  });
  it('maps notification destinations to fixed names', () => {
    expect(notificationDestinationKey({ name: 'App', params: { screen: 'Map', params: { reportId: 'r' } } })).toBe('report');
    expect(notificationDestinationKey({ name: 'App', params: { screen: 'Map', params: { showNearby: true } } })).toBe('map_nearby');
    expect(notificationDestinationKey({ name: 'CleanupReview', params: {} })).toBe('cleanup_review');
    expect(notificationDestinationKey({ url: 'https://litterbugs.app/admin' })).toBe('admin_web');
    expect(notificationDestinationKey({ name: 'Somewhere' })).toBeNull();
  });
  it('counts "shown" only when the destination screen appears', () => {
    beginAppOpen('notification', 'cleanup_review');
    trackScreen('Map');
    time += 800;
    trackScreen('CleanupReview');
    trackScreen('CleanupReview');
    expect(named('app_open_target').map(({ event, ...rest }) => rest)).toEqual([
      { stage: 'requested', source: 'notification', destination: 'cleanup_review' },
      { stage: 'shown', source: 'notification', destination: 'cleanup_review', elapsed_ms: 800 },
    ]);
  });
  it('a report link waits for the report itself', () => {
    beginAppOpen('report_link', 'report');
    expect(pendingAppOpenSource('report')).toBe('report_link');
    trackScreen('Map');
    finishAppOpen('shown', 'cleanup_review');
    time += 1200;
    finishAppOpen('unavailable', 'report');
    finishAppOpen('shown', 'report');
    expect(named('app_open_target').map(({ stage }) => stage)).toEqual(['requested', 'unavailable']);
    expect(pendingAppOpenSource('report')).toBeNull();
  });
  it('ends with timeout or superseded rather than staying open', () => {
    beginAppOpen('report_link', 'report');
    beginAppOpen('notification', 'payments');
    time += 30000;
    vi.advanceTimersByTime(30000);
    expect(named('app_open_target').map(({ stage, destination }) => [stage, destination])).toEqual([
      ['requested', 'report'], ['superseded', 'report'], ['requested', 'payments'], ['timeout', 'payments'],
    ]);
    expect(appOpenProperties('shown', 'email', 'report')).toBeNull();
  });
});

describe('session replay on private screens', () => {
  it('stops on sign-in, payment, payout and account screens and resumes afterwards', () => {
    trackScreen('Reports');
    trackScreen('FundingContribution');
    trackScreen('PayoutSetup');
    trackScreen('Reports');
    expect(client.stopSessionRecording).toHaveBeenCalledTimes(1);
    expect(client.startSessionRecording).toHaveBeenCalledTimes(1);
    expect(client.startSessionRecording).toHaveBeenCalledWith(true);
    for (const name of ['Auth', 'ResetPassword', 'Payments', 'PaymentDetail', 'Profile', 'EditProfile']) expect(replayAllowedOn(name)).toBe(false);
    expect(replayAllowedOn('Reports')).toBe(true);
  });
  it('keeps the map itself out of replay, but records sheets that cover it', () => {
    expect(replayAllowedOn('Map', false)).toBe(false);
    expect(replayAllowedOn('Map', true)).toBe(true);
    trackScreen('Map');
    expect(client.stopSessionRecording).toHaveBeenCalledTimes(1);
    setMapCoveredForReplay(true);
    vi.advanceTimersByTime(699);
    expect(client.startSessionRecording).not.toHaveBeenCalled(); // waits for the sheet to finish sliding in
    vi.advanceTimersByTime(1);
    expect(client.startSessionRecording).toHaveBeenCalledTimes(1);
    setMapCoveredForReplay(false);
    expect(client.stopSessionRecording).toHaveBeenCalledTimes(2);
  });
  it('a sheet that closes before it finished opening never resumes replay', () => {
    trackScreen('Map');
    setMapCoveredForReplay(true);
    vi.advanceTimersByTime(300);
    setMapCoveredForReplay(false);
    vi.advanceTimersByTime(1000);
    expect(client.startSessionRecording).not.toHaveBeenCalled();
  });
});

describe('outcomes are not duplicated', () => {
  it('sign-in ends once: closed after a sign-in or a sent link is ignored', () => {
    trackSignIn('shown', { intent: 'fund' });
    trackSignIn('closed');
    trackSignIn('closed');
    trackSignIn('shown', { intent: 'none' });
    trackSignIn('verification_sent', { method: 'email_signup' });
    trackSignIn('closed');
    trackSignIn('succeeded');
    trackSignIn('succeeded');
    expect(named('app_sign_in').map(({ stage }) => stage)).toEqual(['shown', 'closed', 'shown', 'verification_sent', 'succeeded']);
    expect(named('participation_step').map(({ stage }) => stage)).toEqual(['auth_shown', 'auth_closed']);
  });
  it('a cleanup approval is sent once per cleanup', () => {
    trackCleanupApproved('c1'); trackCleanupApproved('c1'); trackCleanupApproved('c2');
    expect(named('cleanup_approved')).toHaveLength(2);
    expect(named('cleanup_approved')[0]).toEqual({ event: 'cleanup_approved', stage: 'approved' });
  });
  it('analytics failures never reach the app', () => {
    client.capture.mockImplementation(() => { throw new Error('queue full'); });
    expect(() => trackParticipation('report', 'published')).not.toThrow();
    expect(() => startTiming('submission', { flow: 'report' }).finish('ready')).not.toThrow();
  });
  it('nothing is sent when analytics is off', () => {
    __resetAnalyticsForTests({ testClient: null, now: () => time });
    trackParticipation('report', 'published');
    expect(startTiming('submission', { flow: 'report' }).finish('ready')).toBeNull();
    expect(client.capture).not.toHaveBeenCalled();
  });
});
