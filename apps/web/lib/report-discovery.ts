import { getDistanceMiles, hasReportCoordinates, type Coordinates, type Database, type MappableReport, type Report } from '@litterbugs/report-contract';
import type { SupabaseClient } from '@supabase/supabase-js';
import { inBoundary, type BoundaryGeometry } from '@/lib/place-geography';
import { reportDiscoveryWindow } from '@/lib/report-visibility';

export type DiscoveryFilters = {
  status: 'all' | 'available' | 'progress' | 'completed';
  funding: 'all' | 'funded' | 'volunteer';
  severity: 'all' | 'low' | 'medium' | 'high';
  radius: 0 | 5 | 25 | 50;
  query: string;
  scope: 'all' | 'favorites' | 'hidden';
};
export const DEFAULT_DISCOVERY_FILTERS: DiscoveryFilters = { status: 'all', funding: 'all', severity: 'all', radius: 0, query: '', scope: 'all' };
export type DiscoveryArea = Coordinates & { north: number; south: number; west: number; east: number };
export const DISCOVERY_LIMIT = 1000;
const EMPTY_IDS = new Set<string>();

export function matchesDiscovery(report: MappableReport, filters: DiscoveryFilters, center?: Coordinates | null, favorites: ReadonlySet<string> = EMPTY_IDS, hidden: ReadonlySet<string> = EMPTY_IDS, geometry?: BoundaryGeometry) {
  if (geometry && !inBoundary(report, geometry)) return false;
  if (filters.scope === 'hidden' ? !hidden.has(report.id) : hidden.has(report.id)) return false;
  if (filters.scope === 'favorites' && !favorites.has(report.id)) return false;
  if (filters.status === 'available' && report.cleanup_state !== 'available') return false;
  if (filters.status === 'completed' && report.cleanup_state !== 'completed') return false;
  if (filters.status === 'progress' && !['claimed', 'completion_submitted', 'changes_requested'].includes(report.cleanup_state ?? '')) return false;
  if (filters.funding === 'funded' && !(report.funded_amount_cents > 0)) return false;
  if (filters.funding === 'volunteer' && report.funded_amount_cents > 0) return false;
  if (filters.severity !== 'all' && report.severity?.toLowerCase() !== filters.severity) return false;
  const text = [report.title, report.notes_other, ...(report.notes_presets ?? [])].filter(Boolean).join(' ').toLowerCase();
  if (filters.query.trim() && !text.includes(filters.query.trim().toLowerCase())) return false;
  if (filters.radius) {
    const distance = center ? getDistanceMiles(center, report) : NaN;
    if (!Number.isFinite(distance) || distance > filters.radius) return false;
  }
  return true;
}

export async function collectDiscoveryMatches<T>(fetchPage: (offset: number, size: number) => Promise<T[]>, accepts: (row: T) => boolean, limit = DISCOVERY_LIMIT, pageSize = 500) {
  const matches: T[] = [];
  for (let offset = 0; matches.length <= limit; offset += pageSize) {
    const rows = await fetchPage(offset, pageSize);
    for (const row of rows) if (accepts(row)) matches.push(row);
    if (rows.length < pageSize) break;
  }
  return { reports: matches.slice(0, limit), truncated: matches.length > limit };
}

export async function loadDiscoveryReports(client: SupabaseClient<Database>, { filters, area, favorites = EMPTY_IDS, hidden = EMPTY_IDS, signal, geometry }: { filters: DiscoveryFilters; area?: DiscoveryArea | null; favorites?: ReadonlySet<string>; hidden?: ReadonlySet<string>; signal?: AbortSignal; geometry?: BoundaryGeometry }) {
  const window = reportDiscoveryWindow();
  const result = await collectDiscoveryMatches<Report>(async (offset, size) => {
    if (signal?.aborted) throw new Error('Obsolete report search');
    let query = client.from('reports').select('*').eq('is_sample', false).eq('is_published', true)
      .is('cancelled_at', null).is('expired_at', null).or(window);
    if (area) {
      query = query.gte('latitude', area.south).lte('latitude', area.north);
      query = area.west <= area.east
        ? query.gte('longitude', area.west).lte('longitude', area.east)
        : query.or(`longitude.gte.${area.west},longitude.lte.${area.east}`);
    }
    if (filters.status === 'available' || filters.status === 'completed') query = query.eq('cleanup_state', filters.status);
    if (filters.status === 'progress') query = query.in('cleanup_state', ['claimed', 'completion_submitted', 'changes_requested']);
    if (filters.funding === 'funded') query = query.gt('funded_amount_cents', 0);
    if (filters.funding === 'volunteer') query = query.or('funded_amount_cents.lte.0,funded_amount_cents.is.null');
    if (filters.severity !== 'all') query = query.ilike('severity', filters.severity);
    const page = query.order('created_at', { ascending: false }).order('id').range(offset, offset + size - 1);
    const { data, error } = await (signal ? page.abortSignal(signal) : page);
    if (signal?.aborted) throw new Error('Obsolete report search');
    if (error) throw error;
    return data ?? [];
  }, report => hasReportCoordinates(report) && matchesDiscovery(report, filters, area, favorites, hidden, geometry));
  return { ...result, reports: result.reports.filter(hasReportCoordinates) };
}
