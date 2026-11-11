import { AUTH_RESULT_PARAM, SHARED_REPORT_AUTH_PARAM, isSharedReportAuthProvider, type SharedReportAuthProvider } from './participation-auth';
import { communityForEntry, communityForPath, communityProperties, type CommunityEngagementEvent, type CommunityProperties } from './community-metrics';
// Bump when participation semantics/workflows change; compiled into each browser bundle.
export const WORKFLOW_VERSION = 'web-participation-2026-11-10-v5';
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

// Fixed route names: never send search terms, report or member IDs, account paths, or tokens.
export const MEMBER_PROFILE_PAGE = '/members/profile';
export function analyticsPage(pathname: string): string | null {
  if (['/', '/map', '/report', '/report-litter', '/cleaner', '/fund-a-cleanup',
    '/locations', '/communities', '/reports', '/reports/history', '/cleanups', '/get-app', '/about', '/help', '/support', '/terms', '/privacy',
    '/cleanup-policy', '/cleanup-safety', '/photo-review'].includes(pathname)) return pathname;
  if (pathname === '/locations/us-nc-boone') return pathname;
  const community = communityForPath(pathname);
  if (community) return pathname === community.href ? community.href : '/communities/cleanups';
  if (/^\/reports\/[^/]+$/.test(pathname)) return '/reports/detail';
  if (pathname === MEMBER_PROFILE_PAGE || /^\/members\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(pathname)) return MEMBER_PROFILE_PAGE;
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
  clean: ['payout_check', 'payout_setup', 'payout_ready', 'safety_review', 'claim_confirmed', 'evidence_form', 'evidence_submitted'],
} as const;
const COMMON_STAGES = ['action_tapped', 'auth_shown', 'auth_submitted', 'auth_succeeded', 'verification_sent', 'auth_closed'] as const;
export type ParticipationAction = keyof typeof PARTICIPATION_STAGES;
export type ParticipationStage = typeof COMMON_STAGES[number] | typeof PARTICIPATION_STAGES[ParticipationAction][number];

export function participationProperties(value: { action?: unknown; stage?: unknown; source?: unknown }) {
  const { action, stage } = value;
  if ((action !== 'report' && action !== 'fund' && action !== 'clean') || typeof stage !== 'string') return null;
  if (!(COMMON_STAGES as readonly string[]).includes(stage)
    && !(PARTICIPATION_STAGES[action] as readonly string[]).includes(stage)) return null;
  return { action: action as ParticipationAction, stage, ...(isEntrySource(value.source) ? { source: value.source } : {}) };
}

const pendingParticipation: Array<NonNullable<ReturnType<typeof participationProperties>> & { page_type: string }> = [];
export function drainParticipation() {
  return pendingParticipation.splice(0);
}

export function trackParticipation(action: ParticipationAction, stage: ParticipationStage, source?: EntrySource) {
  try {
    consumeParticipationAuthResult();
    if (!analyticsProductionBrowser()) return;
    if (stage === 'action_tapped') participationSources.set(action, source ?? currentEntrySource());
    const safe = participationProperties({ action, stage, source: source ?? participationSources.get(action) });
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
  clean: ['auth_start_failed', 'auth_return_failed', 'auth_rejected', 'auth_network_failed', 'auth_redirect_stalled', 'payout_status_load_failed', 'safety_load_failed', 'safety_save_failed', 'claim_failed', 'photo_prepare_failed', 'photo_upload_failed', 'draft_save_failed', 'evidence_check_failed', 'evidence_submit_unconfirmed'],
} as const;
export type ParticipationFailureReason = typeof FAILURE_REASONS[ParticipationAction][number];
export function participationFailureProperties(value: { action?: unknown; stage?: unknown; reason?: unknown; source?: unknown }) {
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
    const safe = participationFailureProperties({ action, stage, reason, source: participationSources.get(action) });
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

const ENTRY_SOURCES = ['homepage', 'map_action', 'map_pin', 'report_list', 'report_link', 'cluster', 'report_detail', 'community', 'landing_page', 'account', 'direct'] as const;
export type EntrySource = typeof ENTRY_SOURCES[number];
function isEntrySource(value: unknown): value is EntrySource {
  return typeof value === 'string' && (ENTRY_SOURCES as readonly string[]).includes(value);
}
export function entrySourceForPath(path: string): EntrySource {
  if (path === '/') return 'homepage';
  if (path === '/reports' || path === '/cleanups') return 'report_list';
  if (path.startsWith('/reports/')) return 'report_detail';
  if (path.startsWith('/communities/')) return 'community';
  if (['/report-litter', '/fund-a-cleanup', '/cleaner'].includes(path)) return 'landing_page';
  if (path.startsWith('/account')) return 'account';
  return path === '/map' ? 'map_action' : 'direct';
}
const participationSources = new Map<ParticipationAction, EntrySource>();
let reportEntrySource: EntrySource = 'report_detail';
function currentEntrySource(): EntrySource {
  if (window.location.pathname === '/map' && new URLSearchParams(window.location.search).has('report')) return reportEntrySource;
  return entrySourceForPath(window.location.pathname);
}

const MAP_STAGES = ['search_submitted', 'location_search_started', 'location_suggestions_shown', 'location_selected', 'location_search_empty', 'location_search_failed', 'search_results_loaded', 'search_results_empty', 'search_results_failed', 'search_report_opened', 'results_loaded', 'results_empty', 'results_failed', 'closest_requested', 'closest_found', 'closest_empty', 'closest_failed', 'closest_viewed', 'report_opened'] as const;
export type MapSearchSurface = 'toolbar_search' | 'empty_search';
let mapSearchSelection: { placeId: string; surface: MapSearchSurface; started: number } | null = null;
/** In-memory handoff for the homepage search → map route. Never sent or persisted. */
export function rememberMapSearchSelection(placeId: string, surface: MapSearchSurface) {
  if (typeof window === 'undefined') return;
  mapSearchSelection = { placeId, surface, started: Date.now() };
}
export function consumeMapSearchSelection(placeId: string | undefined) {
  if (typeof window === 'undefined') return null;
  if (!mapSearchSelection) return null;
  if (Date.now() - mapSearchSelection.started > 30000) { mapSearchSelection = null; return null; }
  if (mapSearchSelection.placeId !== placeId) return null;
  const selection = mapSearchSelection;
  mapSearchSelection = null;
  return selection;
}
const PAYOUT_STAGES = ['opened', 'form_opened', 'form_loading_started', 'form_loaded', 'form_exited', 'closed', 'back', 'hosted_requested', 'already_ready', 'ready', 'status_failed', 'start_failed', 'load_failed', 'session_ended'] as const;
const SHARED_REPORT_AUTH_STAGES = ['prompt_shown', 'closed', 'attempted', 'handoff_requested', 'handoff_unavailable', 'start_failed', 'redirect_stalled', 'rejected', 'network_failed', 'verification_sent', 'succeeded', 'return_failed'] as const;
export type SharedReportAuthStage = typeof SHARED_REPORT_AUTH_STAGES[number];
const EXIT_TYPES = ['cancelled', 'saved_for_later', 'draft_resumed', 'draft_discarded', 'started_new'] as const;
const SEARCH_SURFACES = ['toolbar_search', 'empty_search', 'map', 'closest_reports'] as const;
const RESULT_BUCKETS = ['0', '1', '2-5', '6-20', '21+'] as const;
const DISTANCE_BUCKETS = ['under_1', '1-10', '10-50', 'over_50'] as const;
export const JOURNEY_EVENTS = ['map_discovery', 'payout_setup', 'participation_decision', 'shared_report_sign_in'] as const;
export type JourneyEvent = typeof JOURNEY_EVENTS[number];
type JourneyInput = { stage?: unknown; source?: unknown; surface?: unknown; result_bucket?: unknown; distance_bucket?: unknown; filtered?: unknown; truncated?: unknown; action?: unknown; exit_type?: unknown; provider?: unknown };
function inList(value: unknown, list: readonly string[]): value is string { return typeof value === 'string' && list.includes(value); }
export function journeyProperties(event: JourneyEvent, value: JourneyInput) {
  if (event === 'participation_decision') {
    const step = participationProperties(value);
    return step && inList(value.exit_type, EXIT_TYPES) ? { ...step, exit_type: value.exit_type } : null;
  }
  if (event === 'payout_setup') return inList(value.stage, PAYOUT_STAGES) ? { stage: value.stage } : null;
  if (event === 'shared_report_sign_in') {
    if (!inList(value.stage, SHARED_REPORT_AUTH_STAGES)) return null;
    if (value.stage === 'prompt_shown' || value.stage === 'closed') return { stage: value.stage };
    return isSharedReportAuthProvider(value.provider) ? { stage: value.stage, provider: value.provider } : null;
  }
  if (event !== 'map_discovery' || !inList(value.stage, MAP_STAGES)) return null;
  return { stage: value.stage,
    ...(isEntrySource(value.source) ? { source: value.source } : {}),
    ...(inList(value.surface, SEARCH_SURFACES) ? { surface: value.surface } : {}),
    ...(inList(value.result_bucket, RESULT_BUCKETS) ? { result_bucket: value.result_bucket } : {}),
    ...(inList(value.distance_bucket, DISTANCE_BUCKETS) ? { distance_bucket: value.distance_bucket } : {}),
    ...(typeof value.filtered === 'boolean' ? { filtered: value.filtered } : {}),
    ...(typeof value.truncated === 'boolean' ? { truncated: value.truncated } : {}),
  };
}
export function reportResultBucket(count: number) {
  return count <= 0 ? '0' : count === 1 ? '1' : count <= 5 ? '2-5' : count <= 20 ? '6-20' : '21+';
}
export function reportDistanceBucket(miles: number) {
  return miles < 1 ? 'under_1' : miles <= 10 ? '1-10' : miles <= 50 ? '10-50' : 'over_50';
}
const pendingJourneys: Array<{ event: JourneyEvent; properties: NonNullable<ReturnType<typeof journeyProperties>> & { page_type: string } }> = [];
export function drainJourneys() { return pendingJourneys.splice(0); }
function trackJourney(event: JourneyEvent, input: JourneyInput) {
  try {
    if (!analyticsProductionBrowser()) return;
    const safe = journeyProperties(event, input);
    if (!safe) return;
    if (event === 'map_discovery' && input.stage === 'report_opened' && isEntrySource(input.source)) reportEntrySource = input.source;
    if (pendingJourneys.length >= 50) pendingJourneys.shift();
    pendingJourneys.push({ event, properties: { ...safe, page_type: analyticsPage(window.location.pathname) ?? '/private' } });
    window.dispatchEvent(new CustomEvent(ANALYTICS_EVENT, { detail: { event } }));
  } catch { /* Measurement cannot change navigation, saves or payouts. */ }
}
export function trackMapDiscovery(stage: typeof MAP_STAGES[number], properties: Omit<JourneyInput, 'stage'> = {}) {
  trackJourney('map_discovery', { ...properties, stage });
}
export function trackPayoutSetup(stage: typeof PAYOUT_STAGES[number]) { trackJourney('payout_setup', { stage }); }
export function trackSharedReportSignIn(stage: SharedReportAuthStage, provider?: SharedReportAuthProvider) {
  trackJourney('shared_report_sign_in', { stage, provider });
}

export function consumeSharedReportAuthResult() {
  try {
    const url = new URL(window.location.href);
    const marker = url.searchParams.get(SHARED_REPORT_AUTH_PARAM);
    if (marker === null || url.pathname === '/sign-in') return;
    url.searchParams.delete(SHARED_REPORT_AUTH_PARAM);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    const [provider, stage] = marker.split(':');
    if (isSharedReportAuthProvider(provider) && (stage === 'succeeded' || stage === 'return_failed') && marker === `${provider}:${stage}`) {
      trackSharedReportSignIn(stage, provider);
    }
  } catch { /* Measurement cannot affect the return destination. */ }
}
export function trackParticipationExit(action: ParticipationAction, stage: ParticipationStage, exit_type: typeof EXIT_TYPES[number]) {
  trackJourney('participation_decision', { action, stage, exit_type, source: participationSources.get(action) });
}

export function clearParticipationContext() {
  participationSources.clear();
  reportEntrySource = 'report_detail';
  mapSearchSelection = null;
}
