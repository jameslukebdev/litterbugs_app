// Product analytics for the app, sent to the same PostHog project as the
// website so app and web funnels line up. Off in development, QA and
// simulator builds: only the store "production" EAS profile turns it on
// (EXPO_PUBLIC_ANALYTICS_ENABLED), so staff testing is never counted.
//
// Event names and fields match apps/web/lib/website-analytics.ts. Only fixed
// categories are sent, never report text, photos, names or emails.

let client = null;
let config = null;
// Read lazily so importing this file never loads native modules (tests, early startup).
function analyticsConfig() {
  if (!config) {
    try { config = require('expo-constants').default?.expoConfig?.extra?.analytics ?? {}; } catch { config = {}; }
  }
  return config;
}

export function analyticsEnabled() {
  const config = analyticsConfig();
  return !(typeof __DEV__ !== 'undefined' && __DEV__) && config.enabled === true && typeof config.posthogKey === 'string' && config.posthogKey.length > 0;
}

export function startAnalytics() {
  if (client || !analyticsEnabled()) return client;
  const config = analyticsConfig();
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
  const properties = participationProperties(action, stage);
  if (!client || !properties) return;
  try { client.capture('participation_step', properties); } catch { /* optional */ }
}

export function trackParticipationFailure(action, stage, reason) {
  const properties = participationFailureProperties(action, stage, reason);
  if (!client || !properties) return;
  try { client.capture('participation_failure', properties); } catch { /* optional */ }
}
