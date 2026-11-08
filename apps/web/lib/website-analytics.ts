import { AUTH_RESULT_PARAM } from './participation-auth';
import { communityForEntry, communityForPath, communityProperties, type CommunityEngagementEvent, type CommunityProperties } from './community-metrics';
export const ANALYTICS_CONSENT_KEY = 'litterbugs:analytics-consent:v1';
export const ANALYTICS_REPLAY_CHOICE_KEY = 'litterbugs:analytics-replay-consent:v1';
export const ANALYTICS_EVENT = 'litterbugs:analytics-event';
export const ANALYTICS_PREFERENCES = 'litterbugs:analytics-preferences';
export type AnalyticsConfig = {
  enabled: boolean;
  production: boolean;
  gaId: string;
  posthogKey: string;
  posthogHost: string;
  clarityId?: string;
};

export function analyticsAllowed(config: AnalyticsConfig, hostname: string) {
  return config.enabled && config.production && hostname === 'litterbugs.app'
    && /^G-[A-Z0-9]+$/.test(config.gaId)
    && /^phc_[A-Za-z0-9_-]+$/.test(config.posthogKey)
    && ['https://us.i.posthog.com', 'https://eu.i.posthog.com'].includes(config.posthogHost);
}

// Fixed route names: never send search terms, report IDs, account paths, or tokens.
export function analyticsPage(pathname: string): string | null {
  if (['/', '/map', '/report', '/report-litter', '/cleaner', '/fund-a-cleanup',
    '/locations', '/communities', '/reports', '/reports/history', '/cleanups', '/get-app', '/about', '/help', '/support', '/terms', '/privacy',
    '/cleanup-policy', '/cleanup-safety', '/photo-review'].includes(pathname)) return pathname;
  if (pathname === '/locations/us-nc-boone') return pathname;
  const community = communityForPath(pathname);
  if (community) return pathname === community.href ? community.href : '/communities/cleanups';
  if (/^\/reports\/[^/]+$/.test(pathname)) return '/reports/detail';
  return null;
}

export function analyticsReferrer(referrer: string) {
  try {
    const url = new URL(referrer);
    return /^https?:$/.test(url.protocol) ? url.origin : '';
  } catch { return ''; }
}

export type WebsiteEvent = 'report_published' | 'contribution_confirmed' | 'cleanup_approved';

function analyticsProductionBrowser() {
  if (typeof window === 'undefined' || window.location.hostname !== 'litterbugs.app'
    || (typeof navigator !== 'undefined' && (navigator.doNotTrack === '1'
      || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl))) return false;
  const choice = localStorage.getItem(ANALYTICS_REPLAY_CHOICE_KEY);
  return choice === 'accepted' || (choice !== 'declined' && localStorage.getItem(ANALYTICS_CONSENT_KEY) !== 'declined');
}

const pendingOutcomes: Array<{ event: WebsiteEvent; id: string } & Partial<CommunityProperties>> = [];
export function drainWebsiteOutcomes() { return pendingOutcomes.splice(0); }

const pendingContributionAttempts = new Map<string, { started: number; community: string | null }>();

export function rememberContributionAttempt(id: string) {
  try {
    if (analyticsProductionBrowser()) {
      const community = communityForEntry(window.location.search ?? '');
      const started = Date.now();
      pendingContributionAttempts.set(id, { started, community });
      if (localStorage.getItem(ANALYTICS_REPLAY_CHOICE_KEY) === 'accepted') {
        localStorage.setItem(`litterbugs:analytics-attempt:${id}`, String(started));
        if (community) localStorage.setItem(`litterbugs:analytics-community-attempt:${id}`, community);
        else localStorage.removeItem?.(`litterbugs:analytics-community-attempt:${id}`);
      }
    }
  } catch { /* Optional measurement only. */ }
}

// Called only from a confirmed backend result. IDs are local deduplication keys;
// they never become analytics properties. These are browser observations,
// not an authoritative financial ledger or a count of all platform activity.
export function trackWebsiteOutcome(event: WebsiteEvent, id: string) {
  try {
    if (!analyticsProductionBrowser()) return;
    const pending = pendingContributionAttempts.get(id);
    if (event === 'contribution_confirmed') {
      const started = pending?.started ?? (localStorage.getItem(ANALYTICS_REPLAY_CHOICE_KEY) === 'accepted'
        ? Number(localStorage.getItem(`litterbugs:analytics-attempt:${id}`)) : 0);
      if (!Number.isFinite(started) || !started || Date.now() < started || Date.now() - started > 24 * 60 * 60 * 1000) return;
    }
    const community = event === 'contribution_confirmed'
      ? pending?.community ?? (localStorage.getItem(ANALYTICS_REPLAY_CHOICE_KEY) === 'accepted'
        ? localStorage.getItem(`litterbugs:analytics-community-attempt:${id}`) : null)
      : communityForEntry(window.location.search ?? '');
    const properties = communityProperties({ community_id: community });
    const detail = { event, id, ...properties };
    if (pendingOutcomes.length >= 30) pendingOutcomes.shift();
    pendingOutcomes.push(detail);
    window.dispatchEvent(new CustomEvent(ANALYTICS_EVENT, { detail }));
    if (event === 'contribution_confirmed') {
      trackParticipation('fund', 'payment_confirmed');
      pendingContributionAttempts.delete(id);
    }
    if (event === 'report_published') trackParticipation('report', 'published');
  } catch { /* Analytics must never interrupt reporting or payment. */ }
}

/** Engagement is intentionally separate from confirmed publication/payment/approval. */
export function trackCommunityEngagement(event: CommunityEngagementEvent, properties: CommunityProperties) {
  try {
    if (!analyticsProductionBrowser()) return;
    const safe = communityProperties(properties);
    if (safe) window.dispatchEvent(new CustomEvent(ANALYTICS_EVENT, { detail: { event, ...safe } }));
  } catch { /* Optional measurement must not affect navigation or saves. */ }
}

const PARTICIPATION_STAGES = {
  report: ['location_picker', 'location_confirmed', 'photos', 'litter_type', 'severity', 'details', 'review', 'published'],
  fund: ['amount_review', 'payment_form', 'payment_ready', 'payment_submitted', 'payment_confirmed'],
  clean: ['safety_review', 'claim_confirmed', 'evidence_form', 'evidence_submitted'],
} as const;
const COMMON_STAGES = ['action_tapped', 'auth_shown', 'auth_submitted', 'auth_succeeded', 'verification_sent', 'auth_closed'] as const;
export type ParticipationAction = keyof typeof PARTICIPATION_STAGES;
export type ParticipationStage = typeof COMMON_STAGES[number] | typeof PARTICIPATION_STAGES[ParticipationAction][number];

export function participationProperties(value: { action?: unknown; stage?: unknown }) {
  const { action, stage } = value;
  if ((action !== 'report' && action !== 'fund' && action !== 'clean') || typeof stage !== 'string') return null;
  if (!(COMMON_STAGES as readonly string[]).includes(stage)
    && !(PARTICIPATION_STAGES[action] as readonly string[]).includes(stage)) return null;
  return { action: action as ParticipationAction, stage };
}

const pendingParticipation: Array<NonNullable<ReturnType<typeof participationProperties>> & { page_type: string }> = [];
export function drainParticipation() {
  return pendingParticipation.splice(0);
}

export function trackParticipation(action: ParticipationAction, stage: ParticipationStage) {
  try {
    consumeParticipationAuthResult();
    if (!analyticsProductionBrowser()) return;
    const safe = participationProperties({ action, stage });
    if (!safe) return;
    if (pendingParticipation.length >= 30) pendingParticipation.shift();
    pendingParticipation.push({ ...safe, page_type: analyticsPage(window.location.pathname) ?? '/private' });
    window.dispatchEvent(new CustomEvent(ANALYTICS_EVENT, { detail: { event: 'participation_step' } }));
  } catch { /* Optional measurement must not interrupt participation. */ }
}

// Fixed categories only. Never accept an Error, filename, provider payload or text.
const FAILURE_REASONS = {
  report: ['auth_start_failed', 'auth_return_failed', 'auth_rejected', 'auth_network_failed', 'auth_redirect_stalled', 'location_denied', 'location_timeout', 'location_unavailable', 'location_stale', 'location_out_of_range', 'photo_prepare_failed', 'photo_upload_failed', 'draft_save_failed', 'publication_unconfirmed'],
  fund: ['auth_start_failed', 'auth_return_failed', 'auth_rejected', 'auth_network_failed', 'auth_redirect_stalled', 'payment_quote_failed', 'payment_start_failed', 'payment_form_failed', 'payment_rejected', 'payment_confirmation_unavailable'],
  clean: ['auth_start_failed', 'auth_return_failed', 'auth_rejected', 'auth_network_failed', 'auth_redirect_stalled', 'safety_load_failed', 'safety_save_failed', 'claim_failed', 'photo_prepare_failed', 'photo_upload_failed', 'draft_save_failed', 'evidence_check_failed', 'evidence_submit_unconfirmed'],
} as const;
export type ParticipationFailureReason = typeof FAILURE_REASONS[ParticipationAction][number];
export function participationFailureProperties(value: { action?: unknown; stage?: unknown; reason?: unknown }) {
  const step = participationProperties(value);
  if (!step || typeof value.reason !== 'string'
    || !(FAILURE_REASONS[step.action] as readonly string[]).includes(value.reason)) return null;
  return { ...step, reason: value.reason };
}
const pendingFailures: Array<NonNullable<ReturnType<typeof participationFailureProperties>> & { page_type: string }> = [];
export function drainParticipationFailures() { return pendingFailures.splice(0); }
export function trackParticipationFailure(action: ParticipationAction, stage: ParticipationStage, reason: ParticipationFailureReason) {
  try {
    consumeParticipationAuthResult();
    if (!analyticsProductionBrowser()) return;
    const safe = participationFailureProperties({ action, stage, reason });
    if (!safe) return;
    if (pendingFailures.length >= 30) pendingFailures.shift();
    pendingFailures.push({ ...safe, page_type: analyticsPage(window.location.pathname) ?? '/private' });
    window.dispatchEvent(new CustomEvent(ANALYTICS_EVENT, { detail: { event: 'participation_failure' } }));
  } catch { /* Optional measurement must not interrupt the task. */ }
}

export function participationMeasurementAllowed() {
  try { return analyticsProductionBrowser(); } catch { return false; }
}

let consumingAuthResult = false;
/** Consume before a destination step so auth success precedes the resumed form. */
export function consumeParticipationAuthResult() {
  if (consumingAuthResult || typeof window === 'undefined') return;
  consumingAuthResult = true;
  try {
    const url = new URL(window.location.href);
    const marker = url.searchParams.get(AUTH_RESULT_PARAM);
    if (marker === null) return;
    url.searchParams.delete(AUTH_RESULT_PARAM);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    const match = /^(report|fund|clean):(success|failed)$/.exec(marker);
    if (!match) return;
    const action = match[1] as ParticipationAction;
    if (match[2] === 'success') trackParticipation(action, 'auth_succeeded');
    else trackParticipationFailure(action, 'auth_submitted', 'auth_return_failed');
  } catch { /* Optional measurement must not affect the return destination. */ }
  finally { consumingAuthResult = false; }
}
