import { describe, expect, it, vi } from 'vitest';
import type { Database, MappableReport } from '@litterbugs/report-contract';
import type { SupabaseClient } from '@supabase/supabase-js';
import { collectDiscoveryMatches, DEFAULT_DISCOVERY_FILTERS, loadDiscoveryReports, matchesDiscovery } from './report-discovery';
const report = { id: 'match', title: 'Bottles', notes_other: 'Country road', cleanup_state: 'available', severity: 'High', funded_amount_cents: 500, latitude: 0, longitude: 179.99 } as MappableReport;
describe('bounded report discovery', () => {
  it('continues past full unmatched pages instead of mistaking the API cap for all results', async () => {
    const rows = Array.from({ length: 1201 }, (_, index) => ({ index }));
    const fetch = vi.fn(async (offset: number, size: number) => rows.slice(offset, offset + size));
    const result = await collectDiscoveryMatches(fetch, row => row.index === 1200);
    expect(result.reports).toEqual([{ index: 1200 }]);expect(result.truncated).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it('limits matching results and explicitly reports truncation', async () => {
    const rows = [0, 1, 2, 3, 4];
    const result = await collectDiscoveryMatches(async (offset, size) => rows.slice(offset, offset + size), () => true, 2, 2);
    expect(result).toEqual({ reports: [0, 1], truncated: true });
  });
  it('combines filters across the dateline and requires a usable origin for distance', () => {
    const filters = { ...DEFAULT_DISCOVERY_FILTERS, severity: 'high' as const, funding: 'funded' as const, radius: 5 as const, query: 'country ROAD' };
    expect(matchesDiscovery(report, filters, { latitude: 0, longitude: -179.99 })).toBe(true);
    expect(matchesDiscovery(report, filters, null)).toBe(false);
    expect(matchesDiscovery(report, filters, { latitude: 0, longitude: NaN })).toBe(false);
    expect(matchesDiscovery({ ...report, severity: 'Low' }, filters, report)).toBe(false);
    expect(matchesDiscovery(report, filters, report, new Set(), new Set(['match']))).toBe(false);
  });
  it('uses stable pages, wrapped longitude bounds, and server-side workflow filters', async () => {
    const chain = {
      select: vi.fn(() => chain), eq: vi.fn(() => chain), is: vi.fn(() => chain), or: vi.fn(() => chain), gte: vi.fn(() => chain), lte: vi.fn(() => chain), in: vi.fn(() => chain), gt: vi.fn(() => chain), ilike: vi.fn(() => chain), order: vi.fn(() => chain), range: vi.fn(() => chain),
      abortSignal: vi.fn(async () => ({ data: [], error: null })),
    };
    const client = { from: vi.fn(() => chain) } as unknown as SupabaseClient<Database>;
    const controller = new AbortController();
    await loadDiscoveryReports(client, { filters: { ...DEFAULT_DISCOVERY_FILTERS, status: 'progress', funding: 'funded', severity: 'high' }, area: { latitude: 0, longitude: 180, north: 1, south: -1, west: 179, east: -179 }, signal: controller.signal });
    expect(chain.or).toHaveBeenCalledWith('longitude.gte.179,longitude.lte.-179');
    expect(chain.in).toHaveBeenCalledWith('cleanup_state', ['claimed', 'completion_submitted', 'changes_requested']);
    expect(chain.ilike).toHaveBeenCalledWith('severity', 'high');
    expect(chain.order).toHaveBeenCalledWith('id');
    expect(chain.range).toHaveBeenCalledWith(0, 499);
    controller.abort();
    await expect(loadDiscoveryReports(client, { filters: DEFAULT_DISCOVERY_FILTERS, signal: controller.signal })).rejects.toThrow('Obsolete');
  });
});
