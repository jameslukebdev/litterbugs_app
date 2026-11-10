import type { ParticipationAction } from './website-analytics';

export const AUTH_RESULT_PARAM = 'participation_auth';
export const SHARED_REPORT_AUTH_PARAM = 'shared_report_auth';
export type SharedReportAuthProvider = 'email' | 'google' | 'facebook';

export function isSharedReportAuthProvider(value: unknown): value is SharedReportAuthProvider {
  return value === 'email' || value === 'google' || value === 'facebook';
}

export function isSharedReportAuthEntry(url: URL, openedOnMap: boolean) {
  if (/^\/reports\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\/?$/i.test(url.pathname)) return true;
  return url.pathname === '/map' && Boolean(url.searchParams.get('report')) && !openedOnMap;
}

export function participationIntent(next: string): ParticipationAction | null {
  try {
    const url = new URL(next, 'https://litterbugs.app');
    if (url.origin !== 'https://litterbugs.app') return null;
    if (url.pathname === '/report') return 'report';
    const intent = url.searchParams.get('intent');
    return url.pathname === '/map' && url.searchParams.has('report') && (intent === 'fund' || intent === 'clean') ? intent : null;
  } catch { return null; }
}
/** A bounded, one-use measurement hint, never an authorization decision. */
export function authResultDestination(next: string, success: boolean, sharedProvider?: string | null) {
  const action = participationIntent(next);
  const destination = new URL(success ? next : '/?authError=callback', 'https://litterbugs.app');
  if (action) destination.searchParams.set(AUTH_RESULT_PARAM, `${action}:${success ? 'success' : 'failed'}`);
  if (isSharedReportAuthProvider(sharedProvider)) {
    destination.searchParams.set(SHARED_REPORT_AUTH_PARAM, `${sharedProvider}:${success ? 'succeeded' : 'return_failed'}`);
  }
  return `${destination.pathname}${destination.search}${destination.hash}`;
}
