export type Period = 7 | 28;
export type SourceId = 'ga' | 'gsc' | 'posthog' | 'clarity' | 'app';
export type Window = { start: string; end: string; timezone: string };
export type SeriesPoint = { date: string; value: number };
export type Row = { label: string; value: number };
export type GoogleData = { sessions: number; users: number | null; views: number | null; daily: SeriesPoint[]; channels: Row[] };
export type SearchData = { clicks: number; impressions: number; ctr: number | null; position: number | null; daily: SeriesPoint[]; queries: Row[] };
export type ProductData = { visits: number; mapVisits: number; reportOpens: number; cleanupStarts: number; cleanupClaims: number; cleanupSubmissions: number; failures: number; mapStarts: number; mapReady: number; mapFailures: number };
export type FrictionData = { sessions: number | null; rageSessions: number | null; deadSessions: number | null; quickBackSessions: number | null; scriptErrorSessions: number | null };
export type AppData = { screens: number; launches: number; reports: number; claims: number; submissions: number; approvals: number; failures: number; signIns: number; reportReadyMedian: number | null; reportReadySamples: number; mapReadyMedian: number | null; mapReadySamples: number };
export type SourceData = { ga: GoogleData; gsc: SearchData; posthog: ProductData; clarity: FrictionData; app: AppData };
export type Source<T> = {
  status: 'live' | 'snapshot' | 'unconfigured' | 'error' | 'awaiting_release';
  updatedAt: string | null;
  window: Window;
  data: T | null;
  note: string;
};
export type Dashboard = { period: Period; sources: { [K in SourceId]: Source<SourceData[K]> } };

export const SOURCE_LINKS: Record<SourceId, string> = {
  ga: 'https://analytics.google.com/analytics/web/#/p561329300/reports/intelligenthome',
  gsc: 'https://search.google.com/search-console/performance/search-analytics?resource_id=sc-domain%3Alitterbugs.app',
  posthog: 'https://us.posthog.com/project/695338/dashboard/2346165',
  clarity: 'https://clarity.microsoft.com/projects/view/z60itnrbpn/dashboard',
  app: 'https://us.posthog.com/project/695338',
};
export const SOURCE_NAMES: Record<SourceId, string> = { ga: 'Google Analytics', gsc: 'Search Console', posthog: 'PostHog · website', clarity: 'Clarity', app: 'PostHog · app' };
export function parsePeriod(value: unknown): Period { return value === '28' ? 28 : 7; }
export function ratio(numerator: number | null | undefined, denominator: number | null | undefined): number | null {
  return numerator != null && denominator != null && denominator > 0 ? numerator / denominator : null;
}

function shift(date: string, days: number) {
  const instant = new Date(`${date}T12:00:00Z`);
  instant.setUTCDate(instant.getUTCDate() + days);
  return instant.toISOString().slice(0, 10);
}
export function reportWindow(period: number, timezone = 'America/New_York', lag = 1, now = new Date()): Window {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const end = shift(today, -lag);
  return { start: shift(end, 1 - period), end, timezone };
}
export function windowLabel(window: Window) {
  const fmt = (date: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date.slice(0, 10)}T12:00:00Z`));
  return `${fmt(window.start)}–${fmt(window.end)}`;
}

export function number(value: unknown): number {
  if (typeof value !== 'number' && typeof value !== 'string') throw new Error('Missing numeric metric');
  if (value === '' || !Number.isFinite(Number(value)) || Number(value) < 0) throw new Error('Invalid numeric metric');
  return Number(value);
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid provider response');
  return value as Record<string, unknown>;
}
export function list(value: unknown): unknown[] { if (!Array.isArray(value)) throw new Error('Invalid provider rows'); return value; }

// Keep imported local data to the same aggregate-only allowlist as live adapters.
export function validateData<K extends SourceId>(id: K, input: unknown): SourceData[K] {
  const d = object(input);
  const metric = (key: string) => number(d[key]);
  const optional = (key: string) => d[key] == null ? null : number(d[key]);
  const daily = () => list(d.daily).slice(0, 28).map(raw => {
    const point = object(raw);
    if (typeof point.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(point.date)) throw new Error('Invalid date');
    return { date: point.date, value: number(point.value) };
  });
  const rows = (key: string) => list(d[key]).slice(0, 8).map(raw => {
    const row = object(raw);
    if (typeof row.label !== 'string') throw new Error('Invalid label');
    return { label: row.label.slice(0, 120), value: number(row.value) };
  });
  let result: SourceData[SourceId];
  if (id === 'ga') result = { sessions: metric('sessions'), users: optional('users'), views: optional('views'), daily: daily(), channels: rows('channels') };
  else if (id === 'gsc') result = { clicks: metric('clicks'), impressions: metric('impressions'), ctr: optional('ctr'), position: optional('position'), daily: daily(), queries: rows('queries') };
  else if (id === 'posthog') result = Object.fromEntries(['visits', 'mapVisits', 'reportOpens', 'cleanupStarts', 'cleanupClaims', 'cleanupSubmissions', 'failures', 'mapStarts', 'mapReady', 'mapFailures'].map(key => [key, metric(key)])) as ProductData;
  else if (id === 'app') result = { screens: metric('screens'), launches: metric('launches'), reports: metric('reports'), claims: metric('claims'), submissions: metric('submissions'), approvals: metric('approvals'), failures: metric('failures'), signIns: metric('signIns'), reportReadyMedian: optional('reportReadyMedian'), reportReadySamples: metric('reportReadySamples'), mapReadyMedian: optional('mapReadyMedian'), mapReadySamples: metric('mapReadySamples') };
  else result = { sessions: optional('sessions'), rageSessions: optional('rageSessions'), deadSessions: optional('deadSessions'), quickBackSessions: optional('quickBackSessions'), scriptErrorSessions: optional('scriptErrorSessions') };
  return result as SourceData[K];
}
