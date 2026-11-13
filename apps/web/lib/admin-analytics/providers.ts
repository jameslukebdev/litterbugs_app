import 'server-only';

import { createSign, createHash } from 'node:crypto';
import { unstable_cache } from 'next/cache';

import { list, number, object, ratio, reportWindow, type Period, type Source, type SourceData, type Window } from './model';

const TIMEOUT = 12_000;
async function request(url: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(url, { ...init, cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT) });
  if (!response.ok) throw new Error('Analytics provider unavailable');
  return response.json();
}
function post(url: string, token: string, body: unknown) {
  return request(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

// Dedicated read-only Google service account. Never reuse the site's public GA tag.
async function googleToken() {
  const account = object(JSON.parse(process.env.ADMIN_ANALYTICS_GOOGLE_SERVICE_ACCOUNT ?? '{}'));
  if (typeof account.client_email !== 'string' || typeof account.private_key !== 'string') throw new Error('Google connection not configured');
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const assertion = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({ iss: account.client_email, scope: 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
  const signature = createSign('RSA-SHA256').update(assertion).sign(account.private_key, 'base64url');
  const result = object(await request('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${assertion}.${signature}` }) }));
  if (typeof result.access_token !== 'string') throw new Error('Google authorization unavailable');
  return result.access_token;
}

function gaRows(raw: unknown) {
  const data = object(raw);
  if (!Array.isArray(data.metricHeaders) || !data.metricHeaders.length) throw new Error('Missing GA metric definitions');
  return data.rows === undefined ? [] : list(data.rows).map(raw => {
    const row = object(raw);
    return { dimensions: list(row.dimensionValues ?? []).map(v => String(object(v).value)), metrics: list(row.metricValues).map(v => number(object(v).value)) };
  });
}
export async function fetchGoogle(window: Window): Promise<SourceData['ga']> {
  const token = await googleToken();
  const base = { dateRanges: [{ startDate: window.start, endDate: window.end }], dimensionFilter: { filter: { fieldName: 'hostName', stringFilter: { matchType: 'EXACT', value: 'litterbugs.app' } } } };
  const run = (body: unknown) => post('https://analyticsdata.googleapis.com/v1beta/properties/561329300:runReport', token, body);
  const [total, daily, channels] = await Promise.all([
    run({ ...base, metrics: ['sessions', 'totalUsers', 'screenPageViews'].map(name => ({ name })) }),
    run({ ...base, dimensions: [{ name: 'date' }], metrics: [{ name: 'sessions' }], orderBys: [{ dimension: { dimensionName: 'date' } }], limit: 28 }),
    run({ ...base, dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 8 }),
  ]);
  const totals = gaRows(total)[0]?.metrics ?? [0, 0, 0];
  return { sessions: totals[0], users: totals[1], views: totals[2], daily: gaRows(daily).map(row => ({ date: row.dimensions[0].replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3'), value: row.metrics[0] })), channels: gaRows(channels).map(row => ({ label: row.dimensions[0], value: row.metrics[0] })) };
}

export async function fetchSearch(window: Window): Promise<SourceData['gsc']> {
  const token = await googleToken();
  const base = { startDate: window.start, endDate: window.end, type: 'web', dataState: 'final' };
  const run = (body: unknown) => post('https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Alitterbugs.app/searchAnalytics/query', token, body);
  const [total, daily, queries] = await Promise.all([run(base), run({ ...base, dimensions: ['date'], rowLimit: 28 }), run({ ...base, dimensions: ['query'], rowLimit: 8 })]);
  const rows = (raw: unknown) => list(object(raw).rows ?? []).map(object);
  const summary = rows(total)[0];
  const clicks = summary ? number(summary.clicks) : 0;
  const impressions = summary ? number(summary.impressions) : 0;
  return { clicks, impressions, ctr: ratio(clicks, impressions), position: summary && impressions ? number(summary.position) : null, daily: rows(daily).map(row => ({ date: String(list(row.keys)[0]), value: number(row.clicks) })), queries: rows(queries).map(row => ({ label: String(list(row.keys)[0]), value: number(row.clicks) })) };
}

const prop = (key: string, value?: string[], operator = 'exact') => ({ key, type: 'event', operator, ...(value ? { value } : {}) });
export function productQuery(window: Window) {
  const event = (event: string, properties: unknown[] = [], math = 'unique_session') => ({ kind: 'EventsNode', event, math, properties });
  const clean = (stage: string) => event('participation_step', [prop('action', ['clean']), prop('stage', [stage])]);
  const map = (stage: string) => event('map_loading', [prop('stage', [stage])], 'total');
  return {
    kind: 'TrendsQuery', interval: 'day', dateRange: { date_from: `${window.start}T00:00:00`, date_to: `${window.end}T23:59:59`, explicitDate: true },
    filterTestAccounts: true, compareFilter: { compare: false }, trendsFilter: { display: 'BoldNumber' },
    properties: [prop('$host', ['litterbugs.app']), prop('is_test', ['true'], 'is_not'), prop('$virt_is_bot', ['true'], 'is_not'), prop('test_environment', undefined, 'is_not_set'), prop('test_run_id', undefined, 'is_not_set'), { key: '$referring_domain', type: 'event', operator: 'not_regex', value: '\\.invalid$' }],
    series: [event('$pageview'), event('$pageview', [prop('$pathname', ['/map'])]), event('map_discovery', [prop('stage', ['report_opened'])]), clean('action_tapped'), clean('claim_confirmed'), clean('evidence_submitted'), event('participation_failure', [], 'total'), map('started'), map('tiles_ready'), map('failed')],
  };
}
export function normalizeProduct(raw: unknown): SourceData['posthog'] {
  const rows = list(object(raw).results).map(object);
  const values = rows.filter(row => row.compare_label !== 'previous').map(row => number(row.aggregated_value));
  if (values.length !== 10) throw new Error('Incomplete product analytics');
  return Object.fromEntries(['visits', 'mapVisits', 'reportOpens', 'cleanupStarts', 'cleanupClaims', 'cleanupSubmissions', 'failures', 'mapStarts', 'mapReady', 'mapFailures'].map((name, i) => [name, values[i]])) as SourceData['posthog'];
}
export async function fetchProduct(window: Window) {
  return normalizeProduct(await post('https://us.posthog.com/api/projects/695338/query/', process.env.ADMIN_ANALYTICS_POSTHOG_KEY ?? '', { query: productQuery(window) }));
}

export function appQuery(window: Window) {
  const event = (event: string, properties: unknown[] = [], math = 'total', math_property?: string) => ({ kind: 'EventsNode', event, math, properties, ...(math_property ? { math_property } : {}) });
  const step = (action: string, stage: string) => event('participation_step', [prop('action', [action]), prop('stage', [stage])]);
  const timing = (metric: string) => [prop('metric', [metric]), prop('outcome', ['ready']), prop('backgrounded', ['false'])];
  return { ...productQuery(window), properties: [prop('surface', ['app']), prop('app_environment', ['production']), prop('$is_emulator', ['true'], 'is_not'), prop('is_test', ['true'], 'is_not'), prop('test_environment', undefined, 'is_not_set'), prop('test_run_id', undefined, 'is_not_set')], series: [
    event('$screen'), event('Application Opened'), step('report', 'published'), step('clean', 'claim_confirmed'), step('clean', 'evidence_submitted'), event('cleanup_approved'), event('participation_failure'), event('app_sign_in', [prop('stage', ['succeeded'])]),
    event('app_timing', timing('report_details'), 'median', 'elapsed_ms'), event('app_timing', timing('report_details')),
    event('app_timing', timing('launch_to_map'), 'median', 'elapsed_ms'), event('app_timing', timing('launch_to_map')),
  ] };
}
export function normalizeApp(raw: unknown): SourceData['app'] {
  const values = list(object(raw).results).map((row, index) => {
    const value = object(row).aggregated_value;
    return (index === 8 || index === 10) && value == null ? null : number(value);
  });
  if (values.length !== 12) throw new Error('Incomplete app analytics');
  if ((values[9] && values[8] == null) || (values[11] && values[10] == null)) throw new Error('Missing timing aggregate');
  return { screens: values[0]!, launches: values[1]!, reports: values[2]!, claims: values[3]!, submissions: values[4]!, approvals: values[5]!, failures: values[6]!, signIns: values[7]!, reportReadyMedian: values[9] ? values[8] : null, reportReadySamples: values[9]!, mapReadyMedian: values[11] ? values[10] : null, mapReadySamples: values[11]! };
}
export async function fetchApp(window: Window) {
  return normalizeApp(await post('https://us.posthog.com/api/projects/695338/query/', process.env.ADMIN_ANALYTICS_POSTHOG_KEY ?? '', { query: appQuery(window) }));
}

// Clarity returns sessions with a signal, not a count of people or clicks.
// Unrecognized/missing metrics stay null; they must not appear as a reassuring zero.
export function normalizeFriction(raw: unknown): SourceData['clarity'] {
  const metrics = list(raw).map(object);
  const get = (metricName: string, field: string) => {
    const metric = metrics.find(metric => metric.metricName === metricName);
    if (!metric) return null;
    const info = list(metric.information);
    if (info.length !== 1) return null;
    const value = object(info[0])[field];
    return value == null ? null : number(value);
  };
  const sessions = get('Traffic', 'totalSessionCount');
  if (sessions == null) throw new Error('Clarity traffic coverage unavailable');
  return { sessions, rageSessions: get('RageClickCount', 'sessionsCount'), deadSessions: get('DeadClickCount', 'sessionsCount'), quickBackSessions: get('QuickbackClick', 'sessionsCount'), scriptErrorSessions: get('ScriptErrorCount', 'sessionsCount') };
}
export async function fetchFriction() {
  return normalizeFriction(await request('https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=3', { headers: { Authorization: `Bearer ${process.env.ADMIN_ANALYTICS_CLARITY_TOKEN ?? ''}` } }));
}

export async function liveSource<K extends keyof SourceData>(id: K, window: Window, loader: () => Promise<SourceData[K]>, note: string): Promise<Source<SourceData[K]>> {
  const credential = id === 'posthog' || id === 'app' ? process.env.ADMIN_ANALYTICS_POSTHOG_KEY : id === 'clarity' ? process.env.ADMIN_ANALYTICS_CLARITY_TOKEN : process.env.ADMIN_ANALYTICS_GOOGLE_SERVICE_ACCOUNT;
  if (!credential) return { status: 'unconfigured', updatedAt: null, window, data: null, note: 'Automatic connection not set up yet.' };
  // Authorization happens before this function. Cache only aggregates, independent
  // of the requesting admin. Clarity shares one cache across both period choices.
  const key = createHash('sha256').update(credential).digest('hex');
  return unstable_cache(async () => {
    try { return { status: 'live' as const, updatedAt: new Date().toISOString(), window, data: await loader(), note }; }
    catch { return { status: 'error' as const, updatedAt: new Date().toISOString(), window, data: null, note: 'This source could not be reached. Its other reports are unaffected.' }; }
  }, ['owner-analytics-v1', id, key, ...(id === 'clarity' ? [] : [window.start, window.end])], { revalidate: id === 'clarity' ? 21_600 : 900 })();
}

export function sourceWindows(period: Period) {
  return { ga: { ...reportWindow(period), timezone: 'GA property dates' }, posthog: reportWindow(period), app: reportWindow(period), gsc: reportWindow(period, 'America/Los_Angeles', 3), clarity: { start: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), end: new Date().toISOString(), timezone: 'UTC · rolling 72 hours' } };
}
