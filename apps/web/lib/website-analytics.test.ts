import { describe, expect, it } from 'vitest';
import { analyticsAllowed, analyticsPage, analyticsReferrer, type AnalyticsConfig } from './website-analytics';

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
