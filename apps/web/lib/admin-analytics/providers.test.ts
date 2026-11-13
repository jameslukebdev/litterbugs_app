import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ unstable_cache: (fn: () => unknown) => fn }));
import { appQuery, liveSource, normalizeApp, normalizeFriction, normalizeProduct, productQuery } from './providers';

afterEach(() => { vi.unstubAllEnvs(); });
const window = { start: '2026-11-06', end: '2026-11-12', timezone: 'America/New_York' };
describe('owner analytics providers', () => {
  it('keeps app production activity separate from web and test builds', () => {
    const query = appQuery(window);
    expect(query.properties).toContainEqual({ key: 'surface', type: 'event', operator: 'exact', value: ['app'] });
    expect(query.properties).toContainEqual({ key: 'app_environment', type: 'event', operator: 'exact', value: ['production'] });
    expect(query.properties).toContainEqual({ key: '$is_emulator', type: 'event', operator: 'is_not', value: ['true'] });
    const timing = query.series[8];
    expect('properties' in timing && timing.properties).toContainEqual({ key: 'backgrounded', type: 'event', operator: 'exact', value: ['false'] });
    expect(query.series.some(row => 'event' in row && row.event === '$exception')).toBe(false);
    expect(query.series.at(-1)).toMatchObject({ kind: 'GroupNode', operator: 'OR', math: 'unique_session' });
  });
  it('does not call a missing app timing sample a zero-millisecond load', () => {
    const values = [0,0,0,0,0,0,0,0,null,0,null,0,0];
    const result = normalizeApp({ results: values.map(aggregated_value => ({ aggregated_value })) });
    expect(result.reportReadyMedian).toBeNull();
    expect(result.mapReadyMedian).toBeNull();
    expect(result.visits).toBe(0);
    values[9] = 1;
    expect(() => normalizeApp({ results: values.map(aggregated_value => ({ aggregated_value })) })).toThrow();
  });
  it('uses full-period PostHog aggregates instead of summing daily unique values', () => {
    const results = [108,36,11,4,1,0,1,0,0,0].map(aggregated_value => ({ aggregated_value, data: [999], count: 999 }));
    expect(normalizeProduct({ results }).visits).toBe(108);
    expect(normalizeProduct({ results }).cleanupSubmissions).toBe(0);
    expect(() => normalizeProduct({ results: results.slice(0,9) })).toThrow();
    expect(() => normalizeProduct({ results: results.map(() => ({ count: 0 })) })).toThrow();
  });
  it('uses the same production exclusions and units for map numerator and denominator', () => {
    const query = productQuery(window);
    expect(query.filterTestAccounts).toBe(true);
    expect(query.properties).toContainEqual({ key: '$host', type: 'event', operator: 'exact', value: ['litterbugs.app'] });
    expect(query.properties).toContainEqual({ key: 'test_run_id', type: 'event', operator: 'is_not_set' });
    expect(query.series.slice(0,2).map(s => [s.event,s.math])).toEqual([['$pageview','unique_session'],['$pageview','unique_session']]);
    expect(query.properties.at(-1)?.value).toBe('\\.invalid$');
  });
  it('keeps missing or unknown Clarity metric fields unknown', () => {
    expect(normalizeFriction([{ metricName: 'Traffic', information: [{ totalSessionCount: '21' }] }, { metricName: 'DeadClickCount', information: [{ sessionsCount: '1' }] }, { metricName: 'RageClickCount', information: [{ sessionsCount: '0' }] }])).toEqual({ sessions: 21, deadSessions: 1, rageSessions: 0, quickBackSessions: null, scriptErrorSessions: null });
    expect(normalizeFriction([{ metricName: 'Traffic', information: [{ totalSessionCount: '21' }] }, { metricName: 'DeadClickCount', information: [{ clickCount: 2 }] }]).deadSessions).toBeNull();
    expect(() => normalizeFriction([])).toThrow('Clarity traffic coverage unavailable');
  });
  it('does not call a provider without a private credential', async () => {
    vi.stubEnv('ADMIN_ANALYTICS_POSTHOG_KEY', '');
    const loader = vi.fn();
    expect((await liveSource('posthog', window, loader, '')).status).toBe('unconfigured');
    expect(loader).not.toHaveBeenCalled();
  });
  it('isolates failed sources and never returns provider errors or credentials', async () => {
    vi.stubEnv('ADMIN_ANALYTICS_POSTHOG_KEY', 'private-credential');
    const result = await liveSource('posthog', window, async () => { throw new Error('token=private-credential and personal data'); }, '');
    expect(result.status).toBe('error');
    expect(result.data).toBeNull();
    expect(JSON.stringify(result)).not.toContain('private-credential');
    expect(JSON.stringify(result)).not.toContain('personal data');
  });
});
