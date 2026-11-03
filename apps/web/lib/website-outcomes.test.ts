import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ANALYTICS_CONSENT_KEY, rememberContributionAttempt, trackWebsiteOutcome } from './website-analytics';
let storage: Map<string, string>;
let dispatch: ReturnType<typeof vi.fn>;
beforeEach(() => {
  storage = new Map([[ANALYTICS_CONSENT_KEY, 'accepted']]);
  dispatch = vi.fn();
  vi.stubGlobal('window', { location: { hostname: 'litterbugs.app' }, dispatchEvent: dispatch });
  vi.stubGlobal('localStorage', { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v) });
});
afterEach(() => vi.unstubAllGlobals());
it('does not count an old receipt or a payment without a recent consented attempt', () => {
  trackWebsiteOutcome('contribution_confirmed', 'receipt');
  expect(dispatch).not.toHaveBeenCalled();
  storage.set('litterbugs:analytics-attempt:receipt', String(Date.now() - 25 * 60 * 60 * 1000));
  trackWebsiteOutcome('contribution_confirmed', 'receipt');
  expect(dispatch).not.toHaveBeenCalled();
  rememberContributionAttempt('receipt');
  trackWebsiteOutcome('contribution_confirmed', 'receipt');
  expect(dispatch).toHaveBeenCalledOnce();
});
it.each(['localhost', '127.0.0.1', 'preview.vercel.app'])('does not record or emit outcomes on %s', hostname => {
  window.location.hostname = hostname;
  rememberContributionAttempt('payment');
  trackWebsiteOutcome('report_published', 'report');
  trackWebsiteOutcome('contribution_confirmed', 'payment');
  expect(dispatch).not.toHaveBeenCalled();
  expect(storage.has('litterbugs:analytics-attempt:payment')).toBe(false);
});
it('withdrawn consent stops outcomes and payment attribution', () => {
  storage.set(ANALYTICS_CONSENT_KEY, 'declined');
  rememberContributionAttempt('payment');
  trackWebsiteOutcome('report_published', 'report');
  expect(dispatch).not.toHaveBeenCalled();
  expect(storage.has('litterbugs:analytics-attempt:payment')).toBe(false);
});
it('keeps a consented contribution origin through receipt navigation without forwarding identifiers', () => {
  Object.assign(window.location, { search: '?returnTo=%2Fcommunities%2Fus%2Fnc%2Fboone' });
  rememberContributionAttempt('receipt');
  Object.assign(window.location, { search: '' });
  trackWebsiteOutcome('contribution_confirmed', 'receipt');
  expect(dispatch.mock.calls[0][0].detail).toEqual({ event: 'contribution_confirmed', id: 'receipt', community_id: 'us-nc-boone' });
});
it.each(['doNotTrack', 'globalPrivacyControl'])('does not persist or emit community attribution when %s is set', signal => {
  vi.stubGlobal('navigator', { [signal]: signal === 'doNotTrack' ? '1' : true });
  rememberContributionAttempt('payment');
  trackWebsiteOutcome('cleanup_approved', 'attempt');
  expect(dispatch).not.toHaveBeenCalled();
  expect(storage.has('litterbugs:analytics-attempt:payment')).toBe(false);
});

it('records new-visitor outcomes without persisting analytics attempt IDs', () => {
  storage.clear();
  trackWebsiteOutcome('report_published', 'new-report');
  rememberContributionAttempt('new-payment');
  expect(storage.has('litterbugs:analytics-attempt:new-payment')).toBe(false);
  trackWebsiteOutcome('contribution_confirmed', 'new-payment');
  expect(dispatch.mock.calls.map(([event]) => event.detail.event)).toEqual(['report_published', 'contribution_confirmed']);
});
