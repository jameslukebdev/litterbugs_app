// Real installed JS SDK and an in-process collector. Only the OS/native bridge is
// replaced: this cannot record a device screen or send traffic to PostHog.
import { createRequire, Module } from 'node:module';
import { dirname, join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import {
  __resetAnalyticsForTests, analyticsCollectionEnabled, beginAppOpen, finishAppOpen, notificationDestinationKey,
  posthogOptions, releaseProperties, setAnalyticsCollectionEnabled, setMapCoveredForReplay, startAnalytics, trackScreen,
} from './analytics';
import { cleanupNotificationDestination } from './cleanupNotifications';

const require = createRequire(import.meta.url);
let recording = false;
const plugin = {
  setup: vi.fn(async (_session, _options, config) => { recording = config.sessionReplay.enabled; }),
  startRecording: vi.fn(async () => { recording = true; }),
  stopRecording: vi.fn(async () => { recording = false; }),
  isEnabled: async () => recording,
  setSessionId: vi.fn(),
  setAnonymousId: vi.fn(),
  setDistinctId: vi.fn(),
  setPersonProperties: vi.fn(),
  setOptOut: vi.fn(async optedOut => { if (optedOut) recording = false; }),
};
const storage = new Map();
const native = {
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
  Platform: { OS: 'ios', constants: { reactNativeVersion: { major: 0, minor: 81, patch: 5 } } },
  AppState: { currentState: 'active', addEventListener: () => ({ remove() {} }) },
  Linking: { getInitialURL: async () => 'litterbugs://reports/private-report-id?token=secret' },
};
// CommonJS requires inside the distributed SDK bypass Vitest's ESM mocks. Replace
// only the native boundaries during synchronous loading, and restore immediately.
const originalLoad = Module._load;
let PostHog;
try {
  Module._load = function (name, parent, ...rest) {
    if (name === 'react-native') return native;
    if (name === './native-deps' && parent.filename.includes('posthog-react-native')) return {
      getAppProperties: () => ({ $app_version: '2.1.0', $app_build: 'local-test', $app_namespace: 'app.test', $os_name: 'iOS' }),
      buildOptimisticAsyncStorage: () => ({ getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) }),
    };
    if (name.endsWith('/OptionalPlugin') && parent.filename.includes('posthog-react-native')) return {
      OptionalReactNativePlugin: plugin, OptionalReactNativePluginVersion: '2.13.0',
    };
    return originalLoad.call(this, name, parent, ...rest);
  };
  ({ PostHog } = require(join(dirname(require.resolve('posthog-react-native')), 'posthog-rn.js')));
} finally { Module._load = originalLoad; }

let sdk;
afterEach(async () => {
  __resetAnalyticsForTests();
  await sdk?.shutdown();
  vi.unstubAllGlobals();
  storage.clear();
  vi.clearAllMocks();
  recording = false;
});

it('delivers scrubbed, attributed events through the SDK and keeps replay paused until a safe screen', async () => {
  const batches = [];
  const requests = [];
  vi.stubGlobal('fetch', async (url, options) => {
      requests.push(url);
      if (url.includes('/batch')) batches.push(...JSON.parse(options.body).batch);
      return { status: 200, text: async () => '', json: async () => ({
        sessionRecording: { sampleRate: 1 }, errorTracking: { autocaptureExceptions: true }, featureFlags: {},
      }) };
    });
  sdk = new PostHog('phc_local_only', {
    ...posthogOptions({ environment: 'test', posthogHost: 'http://collector.invalid' }, {
      isEnabled: true, updateId: 'local-update', runtimeVersion: '2.1.0', channel: 'local-test', isEmbeddedLaunch: true,
    }),
    // Keep JSON inspectable; the production retry/queue limits remain in use.
    disableCompression: true,
  });
  sdk.register(releaseProperties({ environment: 'test' }, {
    isEnabled: true, updateId: 'local-update', runtimeVersion: '2.1.0', channel: 'local-test', isEmbeddedLaunch: true,
  }));
  __resetAnalyticsForTests({ testClient: sdk, now: () => Date.now() });
  await sdk.ready();
  await vi.waitFor(() => expect(plugin.setup).toHaveBeenCalled());
  expect(recording).toBe(false);
  trackScreen('Auth');
  await sdk.flush();
  expect(plugin.startRecording).not.toHaveBeenCalled();
  trackScreen('Reports');
  await vi.waitFor(() => expect(recording).toBe(true));
  trackScreen('Map');
  await vi.waitFor(() => expect(recording).toBe(false));
  setMapCoveredForReplay(true, { delayMs: 0 });
  await vi.waitFor(() => expect(recording).toBe(true));
  setMapCoveredForReplay(false);
  await vi.waitFor(() => expect(recording).toBe(false));

  // Synthetic notification data exercises the real routing and outcome functions,
  // without requesting OS permission, registering a push token or acknowledging a DB row.
  for (const eventType of ['nearby_reports_daily', 'cleanup_reward_sent', 'reporter_payout_waiting', 'completion_submitted', 'changes_requested', 'report_renewal_due', 'cleanup_contribution_refunded']) {
    const destination = cleanupNotificationDestination({ eventType, reportId: 'private-report', cleanupId: 'private-cleanup' });
    beginAppOpen('notification', notificationDestinationKey(destination));
    trackScreen(destination.name === 'App' ? destination.params.screen : destination.name);
  }
  beginAppOpen('notification', 'report');
  finishAppOpen('shown', 'report');
  sdk.captureException(new Error('Failure for private@example.com at https://private.invalid/report'));
  sdk.capture('privacy_probe', { $set: { email: 'private@example.com' }, $set_once: { name: 'PRIVATE_NAME' } });
  await sdk.flush();
  const opens = batches.filter(event => event.event === 'app_open_target');
  expect(opens.filter(event => event.properties.stage === 'shown')).toHaveLength(8);
  expect(batches.some(event => event.event === 'Application Opened')).toBe(true);
  expect(batches.some(event => event.event === '$exception')).toBe(true);
  const encoded = JSON.stringify(batches);
  expect(encoded).not.toMatch(/private-report|private-cleanup|private@example|private.invalid|PRIVATE_NAME|token=secret|\$set/);
  for (const event of batches) expect(event.properties).toMatchObject({
    surface: 'app', app_environment: 'test', $expo_update_id: 'local-update',
  });
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.every(url => url.startsWith('http://collector.invalid/'))).toBe(true);
});

it('retains events through offline failures and delivers them once after reconnecting', async () => {
  let offline = false;
  const received = [];
  let failures = 0;
  vi.stubGlobal('fetch', async (url, options) => {
    if (url.includes('/batch')) {
      if (offline) { failures += 1; throw new TypeError('Offline test'); }
      received.push(...JSON.parse(options.body).batch);
    }
    return { status: 200, text: async () => '', json: async () => ({ featureFlags: {} }) };
  });
  sdk = new PostHog('phc_local_only', {
    ...posthogOptions({ environment: 'test', posthogHost: 'http://collector.invalid' }),
    disableCompression: true, fetchRetryDelay: 1,
  });
  await sdk.ready();
  await sdk.flush();
  offline = true;
  sdk.capture('offline_probe', { stage: 'queued' });
  await expect(sdk.flush()).rejects.toThrow();
  expect(failures).toBeGreaterThan(0);
  expect(failures).toBeLessThanOrEqual(4); // initial request plus three retries
  expect(received.filter(event => event.event === 'offline_probe')).toHaveLength(0);
  offline = false;
  await sdk.flush();
  await sdk.flush();
  expect(received.filter(event => event.event === 'offline_probe')).toHaveLength(1);
});

it('persists the device choice and stops SDK events, exceptions and native replay until re-enabled', async () => {
  const received = [];
  const choices = new Map();
  const preferences = {
    getItem: async key => choices.get(key), setItem: async (key, value) => { choices.set(key, value); },
  };
  vi.stubGlobal('fetch', async (url, options) => {
    if (url.includes('/batch')) received.push(...JSON.parse(options.body).batch);
    return { status: 200, text: async () => '', json: async () => ({
      sessionRecording: { sampleRate: 1 }, errorTracking: { autocaptureExceptions: true }, featureFlags: {},
    }) };
  });
  sdk = new PostHog('phc_local_only', {
    ...posthogOptions({ environment: 'test', posthogHost: 'http://collector.invalid' }), disableCompression: true,
  });
  __resetAnalyticsForTests({ testClient: sdk, testStorage: preferences });
  await sdk.ready();
  trackScreen('Reports');
  await vi.waitFor(() => expect(recording).toBe(true));
  expect(await analyticsCollectionEnabled()).toBe(true);
  await setAnalyticsCollectionEnabled(false);
  expect(await analyticsCollectionEnabled()).toBe(false);
  expect(recording).toBe(false);
  expect(plugin.setOptOut).toHaveBeenLastCalledWith(true);
  sdk.capture('excluded_staff_probe');
  sdk.captureException(new Error('Excluded staff error'));
  trackScreen('Map');
  await sdk.flush();
  expect(received.some(event => event.event === 'excluded_staff_probe')).toBe(false);
  expect(received.some(event => event.event === '$exception')).toBe(false);
  // Opting back in on a private screen must not restart recording there.
  trackScreen('SettingsInfo');
  await setAnalyticsCollectionEnabled(true);
  expect(await analyticsCollectionEnabled()).toBe(true);
  expect(recording).toBe(false);
  sdk.capture('re_enabled_probe');
  await sdk.flush();
  expect(received.filter(event => event.event === 're_enabled_probe')).toHaveLength(1);
});

it('reads the saved exclusion before SDK construction, including on relaunch', async () => {
  const requests = [];
  let saved = 'false';
  let resolveFirstRead;
  const firstRead = new Promise(resolve => { resolveFirstRead = resolve; });
  const preferences = {
    getItem: vi.fn().mockImplementationOnce(() => firstRead).mockImplementation(async () => saved),
    setItem: async (_key, value) => { saved = value; },
  };
  const settings = { enabled: true, environment: 'test', posthogKey: 'phc_local_only', posthogHost: 'http://collector.invalid' };
  vi.stubGlobal('__DEV__', false);
  vi.stubGlobal('fetch', async url => {
    requests.push(url);
    return { status: 200, text: async () => '', json: async () => ({ featureFlags: {} }) };
  });
  const construct = vi.fn(function (...args) { return new PostHog(...args); });
  const load = Module._load;
  Module._load = function (name, parent, ...rest) {
    if (name === 'posthog-react-native') return { PostHog: construct };
    if (name === 'react-native') return native;
    return load.call(this, name, parent, ...rest);
  };
  try {
    __resetAnalyticsForTests({ testStorage: preferences, testConfig: settings });
    const startup = startAnalytics();
    trackScreen('Map');
    expect(construct).not.toHaveBeenCalled();
    resolveFirstRead('false');
    expect(await startup).toBeNull();
    expect(construct).not.toHaveBeenCalled();
    expect(requests).toHaveLength(0);
    await setAnalyticsCollectionEnabled(true);
    sdk = await startAnalytics();
    expect(construct).toHaveBeenCalledOnce();
    await sdk.ready();
    await setAnalyticsCollectionEnabled(false);
    await sdk.shutdown();
    const beforeRelaunch = requests.length;
    __resetAnalyticsForTests({ testStorage: preferences, testConfig: settings });
    expect(await startAnalytics()).toBeNull();
    expect(construct).toHaveBeenCalledOnce();
    expect(requests).toHaveLength(beforeRelaunch);
  } finally { Module._load = load; }
});
