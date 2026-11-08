import type { ParticipationAction } from './website-analytics';

export const AUTH_RESULT_PARAM = 'participation_auth';
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
export function authResultDestination(next: string, success: boolean) {
  const action = participationIntent(next);
  const destination = new URL(success ? next : '/?authError=callback', 'https://litterbugs.app');
  if (action) destination.searchParams.set(AUTH_RESULT_PARAM, `${action}:${success ? 'success' : 'failed'}`);
  return `${destination.pathname}${destination.search}${destination.hash}`;
}
