// Local review only. Uses the owner's existing SEO CLI Google connection without
// copying its refresh token into the website. Production uses a dedicated
// read-only service account instead. Run from anywhere in this repository.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const exec = promisify(execFile);
const dir = fileURLToPath(new URL('../apps/web/.analytics-local/', import.meta.url));
const file = join(dir, 'snapshot.json');
const period = process.argv.includes('--days=28') ? 28 : 7;
const date = (lag, timezone) => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const value = new Date(`${today}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() - lag);
  return value.toISOString().slice(0, 10);
};
async function run(args) {
  const { stdout } = await exec('seo', [...args, '--json'], { timeout: 30_000, maxBuffer: 2_000_000 });
  const result = JSON.parse(stdout);
  if (result.ok === false) throw new Error('Google report unavailable');
  return result;
}
const value = raw => {
  const num = Number(raw);
  if (raw == null || !Number.isFinite(num) || num < 0) throw new Error('Missing aggregate');
  return num;
};
let snapshot;
try { snapshot = JSON.parse(await readFile(file, 'utf8')); } catch { snapshot = {}; }
snapshot[String(period)] ??= {};
for (const id of ['ga', 'gsc']) {
  const lag = id === 'gsc' ? 3 : 1;
  const timezone = id === 'gsc' ? 'America/Los_Angeles' : 'America/New_York';
  const window = { start: date(lag + period - 1, timezone), end: date(lag, timezone), timezone: id === 'ga' ? 'GA property dates' : timezone };
  try {
    let data;
    if (id === 'ga') {
      const base = { dateRanges: [{ startDate: window.start, endDate: window.end }], dimensionFilter: { filter: { fieldName: 'hostName', stringFilter: { matchType: 'EXACT', value: 'litterbugs.app' } } } };
      const query = body => run(['analytics', 'google', 'report', '--property', '561329300', '--body', JSON.stringify(body)]);
      const [total, daily, channels] = await Promise.all([
        query({ ...base, dimensions: [], metrics: ['sessions', 'totalUsers', 'screenPageViews'].map(name => ({ name })) }),
        query({ ...base, dimensions: [{ name: 'date' }], metrics: [{ name: 'sessions' }], orderBys: [{ dimension: { dimensionName: 'date' } }], limit: 28 }),
        query({ ...base, dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 8 }),
      ]);
      const report = result => result.report ?? result;
      const totals = report(total).rows?.[0]?.metricValues?.map(v => value(v.value)) ?? [0, 0, 0];
      if (!Array.isArray(report(total).metricHeaders) || report(total).rows?.[0]?.dimensionValues?.length) throw new Error('Expected overall GA totals');
      data = { sessions: totals[0], users: totals[1], views: totals[2], daily: (report(daily).rows ?? []).map(row => ({ date: row.dimensionValues[0].value.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3'), value: value(row.metricValues[0].value) })), channels: (report(channels).rows ?? []).slice(0, 8).map(row => ({ label: row.dimensionValues[0].value, value: value(row.metricValues[0].value) })) };
    } else {
      const base = { startDate: window.start, endDate: window.end, type: 'web', dataState: 'final' };
      const query = body => run(['gsc-query', '--site', 'sc-domain:litterbugs.app', '--body', JSON.stringify(body)]);
      // Explicit [] avoids the SEO CLI's default query dimension. A query row
      // cannot supply property totals (anonymized searches are excluded there).
      const [total, daily, queries] = await Promise.all([query({ ...base, dimensions: [] }), query({ ...base, dimensions: ['date'], rowLimit: 28 }), query({ ...base, dimensions: ['query'], rowLimit: 8 })]);
      const totals = total.rows?.[0];
      if (totals?.keys?.length || (total.rows?.length ?? 0) > 1) throw new Error('Expected overall search totals');
      const clicks = totals ? value(totals.clicks) : 0;
      const impressions = totals ? value(totals.impressions) : 0;
      if ((daily.rows ?? []).reduce((sum, row) => sum + value(row.clicks), 0) !== clicks) throw new Error('Search totals do not reconcile');
      data = { clicks, impressions, ctr: impressions ? clicks / impressions : null, position: impressions ? value(totals.position) : null, daily: (daily.rows ?? []).map(row => ({ date: row.keys[0], value: value(row.clicks) })), queries: (queries.rows ?? []).slice(0, 8).map(row => ({ label: row.keys[0].slice(0, 120), value: value(row.clicks) })) };
    }
    snapshot[String(period)][id] = { window, updatedAt: new Date().toISOString(), data };
    console.log(`${id}: saved ${period}-day aggregate snapshot.`);
  } catch {
    // Preserve last good observation and its original timestamp. Never replace
    // a failed request with made-up zeros or mark old data as newly fetched.
    console.log(`${id}: report unavailable; previous snapshot preserved if present.`);
  }
}
await mkdir(dir, { recursive: true, mode: 0o700 });
// Merge other sources again in case an assistant updated them during collection.
let latest;
try { latest = JSON.parse(await readFile(file, 'utf8')); } catch { latest = {}; }
const google = snapshot[String(period)];
latest[String(period)] = { ...latest[String(period)], ...(google.ga ? { ga: google.ga } : {}), ...(google.gsc ? { gsc: google.gsc } : {}) };
const temporary = `${file}.${process.pid}.tmp`;
await writeFile(temporary, `${JSON.stringify(latest, null, 2)}\n`, { mode: 0o600 });
await rename(temporary, file);
