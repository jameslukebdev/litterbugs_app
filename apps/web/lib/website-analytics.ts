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
    window.dispatchEvent(new CustomEvent(ANALYTICS_EVENT, { detail: { event, id, ...properties } }));
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
  fund: ['amount_review', 'payment_form', 'payment_submitted', 'payment_confirmed'],
  clean: ['safety_review', 'claim_confirmed', 'evidence_form', 'evidence_submitted'],
} as const;
const COMMON_STAGES = ['action_tapped', 'auth_shown', 'auth_submitted', 'auth_closed'] as const;
type ParticipationAction = keyof typeof PARTICIPATION_STAGES;
type ParticipationStage = typeof COMMON_STAGES[number] | typeof PARTICIPATION_STAGES[ParticipationAction][number];

export function participationProperties(value: { action?: unknown; stage?: unknown }) {
  const { action, stage } = value;
  if ((action !== 'report' && action !== 'fund' && action !== 'clean') || typeof stage !== 'string') return null;
  if (!(COMMON_STAGES as readonly string[]).includes(stage)
    && !(PARTICIPATION_STAGES[action] as readonly string[]).includes(stage)) return null;
  return { action, stage };
}

const pendingParticipation: Array<NonNullable<ReturnType<typeof participationProperties>> & { page_type: string }> = [];
export function drainParticipation() {
  return pendingParticipation.splice(0);
}

export function trackParticipation(action: ParticipationAction, stage: ParticipationStage) {
  try {
    if (!analyticsProductionBrowser()) return;
    const safe = participationProperties({ action, stage });
    if (!safe) return;
    if (pendingParticipation.length >= 30) pendingParticipation.shift();
    pendingParticipation.push({ ...safe, page_type: analyticsPage(window.location.pathname) ?? '/private' });
    window.dispatchEvent(new CustomEvent(ANALYTICS_EVENT, { detail: { event: 'participation_step' } }));
  } catch { /* Optional measurement must not interrupt participation. */ }
}
