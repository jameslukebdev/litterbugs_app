import 'server-only';

import { getAdminAccessState } from '@/lib/admin-access';
import { createClient } from '@/lib/supabase/server';
import { object, validateData, type Source, type SourceData, type Window } from './model';

// A database lease reserves Clarity quota before network I/O across all server
// instances, admins, period choices and deployments. Only aggregates are stored.
export async function hostedClaritySource(window: Window, loader: () => Promise<SourceData['clarity']>, note: string): Promise<Source<SourceData['clarity']>> {
  if (await getAdminAccessState() !== 'authorized') throw new Error('Admin access required');
  const unavailable: Source<SourceData['clarity']> = { status: 'error', data: null, window, updatedAt: null, note: '' };
  try {
    const client = await createClient();
    const { data, error } = await client.rpc('owner_analytics_clarity_cache');
    if (error) return unavailable;
    const claim = object(data);
    if (claim.claimed !== true) {
      if (!claim.source) return unavailable;
      const saved = object(claim.source); const dates = object(saved.window);
      if (!['live', 'error'].includes(String(saved.status)) || typeof saved.updatedAt !== 'string' || !Number.isFinite(Date.parse(saved.updatedAt)) || typeof dates.start !== 'string' || typeof dates.end !== 'string') return unavailable;
      return { status: saved.status as 'live' | 'error', data: saved.status === 'live' ? validateData('clarity', saved.data) : null, updatedAt: saved.updatedAt, window: { start: dates.start, end: dates.end, timezone: 'UTC · rolling 72 hours' }, note };
    }
    if (typeof claim.lease !== 'string') return unavailable;
    const updatedAt = new Date().toISOString();
    const observedWindow = { start: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), end: updatedAt, timezone: 'UTC · rolling 72 hours' };
    let source: Source<SourceData['clarity']>;
    try { source = { status: 'live', data: validateData('clarity', await loader()), updatedAt, window: observedWindow, note }; }
    catch { source = { ...unavailable, window: observedWindow, updatedAt }; }
    const { error: saveError } = await client.rpc('owner_analytics_clarity_cache', { target_lease: claim.lease, observed_source: { status: source.status, data: source.data, updatedAt, window: observedWindow } });
    return saveError ? unavailable : source;
  } catch { return unavailable; }
}
