import 'server-only';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { getAdminAccessState } from '@/lib/admin-access';
import { object, validateData, type Dashboard, type Period, type Source, type SourceData, type SourceId } from './model';
import { fetchApp, fetchFriction, fetchGoogle, fetchProduct, fetchSearch, liveSource, sourceWindows } from './providers';

async function localSnapshot<K extends SourceId>(id: K, period: Period): Promise<Source<SourceData[K]> | null> {
  // Local review data must never become an accidental production data source.
  if (process.env.NODE_ENV !== 'development') return null;
  try {
    const json = object(JSON.parse(await readFile(join(process.cwd(), '.analytics-local', 'snapshot.json'), 'utf8')));
    const entry = object(id === 'clarity' ? json.clarity : object(json[String(period)])[id]);
    const window = object(entry.window);
    if (![window.start, window.end, window.timezone, entry.updatedAt].every(value => typeof value === 'string')) return null;
    if (!Number.isFinite(Date.parse(String(entry.updatedAt)))) return null;
    if (![window.start, window.end].every(value => /^\d{4}-\d{2}-\d{2}/.test(String(value)) && Number.isFinite(Date.parse(String(value))))) return null;
    return { status: 'snapshot', data: validateData(id, entry.data), updatedAt: String(entry.updatedAt), window: { start: String(window.start), end: String(window.end), timezone: String(window.timezone) }, note: id === 'ga' && entry.provenance === 'ga-ui' ? 'Google Analytics UI snapshot. Property-wide, without an extra hostname filter. Daily trend not captured. Does not refresh automatically.' : 'Local review snapshot. Does not refresh automatically.' };
  } catch { return null; }
}

export async function loadDashboard(period: Period): Promise<Dashboard> {
  // Keep this check here even though the page is also gated. A future caller
  // must not fetch or serialize private analytics before full admin + MFA auth.
  if (await getAdminAccessState() !== 'authorized') throw new Error('Admin access required');
  const windows = sourceWindows(period);
  async function source<K extends SourceId>(id: K, loader: () => Promise<SourceData[K]>, note: string) {
    const live = await liveSource(id, windows[id], loader, note);
    return live.status === 'unconfigured' ? await localSnapshot(id, period) ?? live : live;
  }
  const [ga, gsc, posthog, clarity, appResult] = await Promise.all([
    source('ga', () => fetchGoogle(windows.ga), 'Production hostname only. GA sessions and users use Google’s definitions; internal traffic settings apply in GA.'),
    source('gsc', () => fetchSearch(windows.gsc), 'Final web-search data, ending three days ago. Query rows omit anonymized searches and show only the top eight.'),
    source('posthog', () => fetchProduct(windows.posthog), 'Production only; known tests and bots excluded. Older unmarked staff visits may remain. Definitions are proposed, not approved catalog metrics.'),
    source('clarity', fetchFriction, 'Rolling last 72 hours, UTC. Refreshed at most every six hours. Signals can overlap; they are not confirmed bugs.'),
    source('app', () => fetchApp(windows.app), 'Production app only; test builds and emulators excluded. Anonymous install identities are not people. Native crashes without release attribution require a separate review.'),
  ]);
  const app = appResult.status === 'unconfigured' || (appResult.data && !Object.values(appResult.data).some(value => typeof value === 'number' && value > 0))
    ? { ...appResult, status: 'awaiting_release' as const, data: null, note: appResult.status === 'unconfigured' ? 'Latest app analytics are still being finished. Production activity will appear after release and connection; test-build activity stays excluded.' : 'No production app activity returned for this period. Test builds and emulators are excluded.' }
    : appResult;
  return { period, sources: { ga, gsc, posthog, clarity, app } };
}
