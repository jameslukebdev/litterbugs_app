import { describe, expect, it, vi } from 'vitest';
import { ANALYTICS_REPLAY_CHOICE_KEY, analyticsAllowed, analyticsPage, analyticsReferrer, consumeSharedReportAuthResult, drainJourneys, type AnalyticsConfig } from './website-analytics';

const config: AnalyticsConfig = { enabled: true, production: true, gaId: 'G-TEST123', posthogKey: 'phc_test', posthogHost: 'https://us.i.posthog.com' };
describe('analytics privacy boundary', () => {
  it.each(['localhost', '127.0.0.1', 'preview.vercel.app', 'litterbugs.app.example.com'])('never permits %s', hostname => {
    expect(analyticsAllowed(config, hostname)).toBe(false);
  });
  it('requires production, explicit enablement, and both configured providers', () => {
    expect(analyticsAllowed(config, 'litterbugs.app')).toBe(true);
    for (const change of [{ enabled: false }, { production: false }, { gaId: '' }, { posthogKey: '' }, { posthogHost: 'https://unknown.example' }]) {
      expect(analyticsAllowed({ ...config, ...change }, 'litterbugs.app')).toBe(false);
    }
  });
  it('removes report IDs and rejects all private or unknown routes', () => {
    expect(analyticsPage('/reports/private-id')).toBe('/reports/detail');
    for (const path of ['/account', '/account/reports/secret', '/auth/reset-password', '/payment-return', '/admin', '/members/id', '/unreviewed']) {
      expect(analyticsPage(path)).toBeNull();
    }
    expect(analyticsPage('/report-litter')).toBe('/report-litter');
    expect(analyticsPage('/get-app')).toBe('/get-app');
  });
  it('keeps referrer origin only, stripping searches, paths, and tokens', () => {
    expect(analyticsReferrer('https://www.google.com/search?q=private#secret')).toBe('https://www.google.com');
    expect(analyticsReferrer('invalid')).toBe('');
    expect(analyticsReferrer('javascript:alert(1)')).toBe('');
  });
});

it.each([false, true])('consumes a shared-report result once while respecting opt-out (%s)', optedOut => {
  const url = new URL('https://litterbugs.app/map?report=private&shared_report_auth=google%3Asucceeded#map');
  const replaceState = vi.fn((_state, _title, path: string) => { url.href = new URL(path, url).href; });
  vi.stubGlobal('window', { location: url, history: { state: null, replaceState }, dispatchEvent: vi.fn() });
  vi.stubGlobal('localStorage', { getItem: (key: string) => optedOut && key === ANALYTICS_REPLAY_CHOICE_KEY ? 'declined' : null });
  try {
    consumeSharedReportAuthResult();
    consumeSharedReportAuthResult();
    expect(replaceState).toHaveBeenCalledExactlyOnceWith(null, '', '/map?report=private#map');
    expect(drainJourneys()).toEqual(optedOut ? [] : [
      { event: 'shared_report_sign_in', properties: { stage: 'succeeded', provider: 'google', page_type: '/map' } },
    ]);
  } finally {
    drainJourneys();
    vi.unstubAllGlobals();
  }
});
