import Constants from 'expo-constants';

// Product analytics for the app, sent to the same PostHog project as the
// website so app and web funnels line up. Off in development, QA and
// simulator builds: only the store "production" EAS profile turns it on
// (EXPO_PUBLIC_ANALYTICS_ENABLED), so staff testing is never counted.
//
// Event names and fields match apps/web/lib/website-analytics.ts. Only fixed
// categories are sent, never report text, photos, names or emails.

const config = Constants.expoConfig?.extra?.analytics ?? {};
let client = null;

export function analyticsEnabled() {
  return !__DEV__ && config.enabled === true && typeof config.posthogKey === 'string' && config.posthogKey.length > 0;
}

export function startAnalytics() {
  if (client || !analyticsEnabled()) return client;
  try {
    // Loaded lazily so builds without analytics never touch the native module.
    const module = require('posthog-react-native');
    const PostHog = module.PostHog ?? module.default;
    client = new PostHog(config.posthogKey, {
      host: config.posthogHost || 'https://us.i.posthog.com',
      personProfiles: 'never',
      captureAppLifecycleEvents: true,
      enableSessionReplay: true,
      sessionReplayConfig: { maskAllTextInputs: true, maskAllImages: true },
      errorTracking: { autocapture: { uncaughtExceptions: true, unhandledRejections: true } },
    });
    client.register({ surface: 'app' });
  } catch {
    client = null; // Measurement must never stop the app from starting.
  }
  return client;
}

let lastScreen = null;
export function trackScreen(name) {
  if (!client || !name || name === lastScreen) return;
  lastScreen = name;
  try { client.screen(name); } catch { /* optional */ }
}

const PARTICIPATION_STAGES = {
  report: ['action_tapped', 'review', 'published'],
  fund: ['action_tapped', 'payment_form', 'payment_confirmed'],
  clean: ['action_tapped', 'claim_confirmed', 'evidence_submitted'],
};

export function trackParticipation(action, stage) {
  if (!client || !PARTICIPATION_STAGES[action]?.includes(stage)) return;
  try { client.capture('participation_step', { action, stage }); } catch { /* optional */ }
}
