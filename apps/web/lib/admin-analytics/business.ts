import 'server-only';

import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { getAdminAccessState } from '@/lib/admin-access';
import { list, number, object, reportWindow, type BusinessData, type Period, type Source } from './model';

const execute = promisify(execFile);
const EXPECTED_PROJECT = 'mvaygkflcjswtwchflrk';
let pending: { day: string; expires: number; result: Promise<{ rows: unknown[]; updatedAt: string }> } | undefined;

export function normalizeBusiness(value: unknown): BusinessData {
  const row = object(value);
  const integer = (value: unknown) => { const result = number(value); if (!Number.isSafeInteger(result)) throw new Error('Invalid business count'); return result; };
  const required = (key: string) => integer(row[key]);
  const optional = (key: string) => row[key] == null ? null : number(row[key]);
  const previous = object(row.previous);
  const daily = list(row.daily).map(value => {
    const day = object(value);
    if (typeof day.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day.date)) throw new Error('Invalid business date');
    return { date: day.date, reports: number(day.reports), cleanups: number(day.cleanups) };
  });
  const data: BusinessData = {
    newReports: required('newReports'), completedCleanups: required('completedCleanups'), fundedCents: required('fundedCents'), refundedCents: required('refundedCents'), contributors: required('contributors'),
    paidCleanups: required('paidCleanups'), awaitingCleanup: required('awaitingCleanup'), fundedWaiting: required('fundedWaiting'), oldestWaitingDays: optional('oldestWaitingDays'), awaitingReview: required('awaitingReview'),
    pounds: optional('pounds'), weightCount: required('weightCount'), bags: optional('bags'), bagsCount: required('bagsCount'), hours: optional('hours'), durationCount: required('durationCount'), daily,
    previous: { newReports: integer(previous.newReports), completedCleanups: integer(previous.completedCleanups), fundedCents: integer(previous.fundedCents), contributors: integer(previous.contributors) },
  };
  if (daily.reduce((sum, day) => sum + day.reports, 0) !== data.newReports
    || daily.reduce((sum, day) => sum + day.cleanups, 0) !== data.completedCleanups
    || data.fundedWaiting > data.awaitingCleanup || data.paidCleanups > data.completedCleanups
    || Math.max(data.weightCount, data.bagsCount, data.durationCount) > data.completedCleanups) throw new Error('Business totals did not reconcile');
  return data;
}

// This local-only adapter uses the owner's existing CLI authentication. It
// executes a fixed, reviewed SELECT, excluding marked review accounts and using
// explicit local-midnight boundaries. It returns only aggregates. No credential
// is copied into the app and no database/schema change is made. Production
// enablement will use a separately reviewed read-only aggregate connection.
export async function loadBusiness(period: Period): Promise<Source<BusinessData>> {
  const window = reportWindow(period);
  const unavailable: Source<BusinessData> = { status: 'unconfigured', data: null, window, updatedAt: null, note: '' };
  if (process.env.NODE_ENV !== 'development') return unavailable;
  if (await getAdminAccessState() !== 'authorized') throw new Error('Admin access required');
  try {
    const root = resolve(process.cwd(), '../..');
    const linked = (await readFile(resolve(root, 'supabase/.temp/project-ref'), 'utf8')).trim();
    if (linked !== EXPECTED_PROJECT) throw new Error('Unexpected linked project');
    if (!pending || pending.day !== window.end || pending.expires < Date.now()) {
      pending = { day: window.end, expires: Date.now() + 300_000, result: execute('supabase', ['db', 'query', '--linked', '--file', resolve(root, 'scripts/owner-analytics-business.sql'), '--output', 'json'], { cwd: root, timeout: 20_000, maxBuffer: 256_000 }).then(({ stdout }) => ({ rows: list(object(JSON.parse(stdout)).rows), updatedAt: new Date().toISOString() })) };
    }
    const result = await pending.result;
    const row = object(result.rows.find(raw => object(raw).period === period));
    if (row.starts !== window.start || row.ends !== window.end) throw new Error('Business period mismatch');
    const previousWindow = reportWindow(period, 'America/New_York', period + 1);
    if (row.previous_starts !== previousWindow.start || row.previous_ends !== previousWindow.end) throw new Error('Business comparison period mismatch');
    const data = normalizeBusiness(row.data);
    if (data.daily.length !== period) throw new Error('Incomplete daily business data');
    return { status: 'live', data, window, updatedAt: result.updatedAt, note: '' };
  } catch {
    // A temporary provider failure never becomes a false zero or a raw error.
    pending = undefined;
    return { ...unavailable, status: 'error' };
  }
}
