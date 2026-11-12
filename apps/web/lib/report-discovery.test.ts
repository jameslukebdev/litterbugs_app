import { describe, expect, it, vi } from 'vitest';
import type { Database, MappableReport } from '@litterbugs/report-contract';
import type { SupabaseClient } from '@supabase/supabase-js';
import { collectDiscoveryMatches, DEFAULT_DISCOVERY_FILTERS, loadDiscoveryReports, matchesDiscovery } from './report-discovery';
const report = { id: 'match', title: 'Bottles', notes_other: 'Country road', cleanup_state: 'available', severity: 'High', funded_amount_cents: 500, latitude: 0, longitude: 179.99 } as MappableReport;
describe('bounded report discovery', () => {
  it.each(['all', 'available', 'progress', 'completed'] as const)('matches %s against every cleanup workflow state', status => {
    for (const state of ['available', 'claimed', 'completion_submitted', 'changes_requested', 'completed'] as const) {
      const expected = status === 'all' || (status === 'progress' ? ['claimed', 'completion_submitted', 'changes_requested'].includes(state) : status === state);
      expect(matchesDiscovery({ ...report, cleanup_state: state }, { ...DEFAULT_DISCOVERY_FILTERS, status })).toBe(expected);
    }
  });
  it.each(['low', 'medium', 'high'] as const)('matches %s priority without case sensitivity', severity => {
    expect(matchesDiscovery({ ...report, severity: severity.toUpperCase() }, { ...DEFAULT_DISCOVERY_FILTERS, severity })).toBe(true);
    expect(matchesDiscovery({ ...report, severity: 'Other' }, { ...DEFAULT_DISCOVERY_FILTERS, severity })).toBe(false);
  });
  it('distinguishes saved favorites from hidden reports, including reports in both sets', () => {
    const favorites = new Set([report.id]);
    const hidden = new Set([report.id]);
    expect(matchesDiscovery(report, DEFAULT_DISCOVERY_FILTERS, null, favorites)).toBe(true);
    expect(matchesDiscovery(report, { ...DEFAULT_DISCOVERY_FILTERS, scope: 'favorites' }, null, favorites)).toBe(true);
    expect(matchesDiscovery(report, { ...DEFAULT_DISCOVERY_FILTERS, scope: 'favorites' }, null)).toBe(false);
    expect(matchesDiscovery(report, DEFAULT_DISCOVERY_FILTERS, null, favorites, hidden)).toBe(false);
    expect(matchesDiscovery(report, { ...DEFAULT_DISCOVERY_FILTERS, scope: 'favorites' }, null, favorites, hidden)).toBe(false);
    expect(matchesDiscovery(report, { ...DEFAULT_DISCOVERY_FILTERS, scope: 'hidden' }, null, favorites, hidden)).toBe(true);
  });
  it.each([5, 25, 50] as const)('applies the %i mile limit from the map center', radius => {
    const filters = { ...DEFAULT_DISCOVERY_FILTERS, radius };
    expect(matchesDiscovery(report, filters, report)).toBe(true);
    expect(matchesDiscovery(report, filters, { latitude: 10, longitude: 0 })).toBe(false);
  });
  it('separates funded and volunteer reports using completed rewards after cleanup', () => {
    for (const state of ['available', 'completed'] as const) {
      for (const cents of [0, 500]) {
        const candidate = { ...report, cleanup_state: state, funded_amount_cents: state === 'completed' ? 0 : cents, completedRewardCents: cents };
        expect(matchesDiscovery(candidate, { ...DEFAULT_DISCOVERY_FILTERS, funding: 'funded' })).toBe(cents > 0);
        expect(matchesDiscovery(candidate, { ...DEFAULT_DISCOVERY_FILTERS, funding: 'volunteer' })).toBe(cents === 0);
      }
    }
  });
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
