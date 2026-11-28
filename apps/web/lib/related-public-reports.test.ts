import { beforeEach, expect, it, vi } from 'vitest';
const { createClient, communities, town } = vi.hoisted(() => ({ createClient: vi.fn(), communities: vi.fn(), town: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('./supabase/public', () => ({ createPublicClient: createClient }));
vi.mock('./report-communities', () => ({ loadReportCommunities: communities }));
vi.mock('./report-town-lookup', () => ({ lookupReportTown: town }));
import { loadRelatedPublicReports } from './related-public-reports';

const row = {
  id: 'another', title: 'Roadside litter', latitude: 36.2, longitude: -81.6,
  cleanup_state: 'available', is_published: true, is_sample: false,
  cancelled_at: null, expired_at: null, expires_at: '2099-01-01',
};
function fixture(data: unknown[], error: unknown = null) {
  const q = Object.fromEntries(['select', 'neq', 'eq', 'is', 'in', 'gte', 'lte', 'order'].map(key => [key, vi.fn(() => q)]));
  q.limit = vi.fn().mockResolvedValue({ data, error });
  createClient.mockReturnValue({ from: vi.fn(() => q) });
  return q;
}
beforeEach(() => {
  vi.clearAllMocks();
  communities.mockResolvedValue(new Map());
  town.mockResolvedValue(null);
});

it('lists nearby public reports, nearest first, and leaves out private, sample, withdrawn, expired and distant ones', async () => {
  const q = fixture([
    row, { ...row, id: 'current' }, { ...row, id: 'private', is_published: false },
    { ...row, id: 'sample', is_sample: true }, { ...row, id: 'cancelled', cancelled_at: '2026-01-01' },
    { ...row, id: 'expired', expires_at: '2020-01-01' }, { ...row, id: 'closed', expired_at: '2026-01-01' },
    { ...row, id: 'far', latitude: 36.5 }, { ...row, id: 'pending', cleanup_state: 'completion_submitted' },
    { ...row, id: 'completed', cleanup_state: 'completed', latitude: 36.21, expires_at: '2020-01-01' },
  ]);
  const related = await loadRelatedPublicReports('current', 36.2, -81.6);
  expect(related.map(item => [item.id, item.path])).toEqual([
    ['another', '/litter-reports/roadside-litter-another'],
    ['completed', '/litter-reports/roadside-litter-completed'],
  ]);
  expect(q.neq).toHaveBeenCalledWith('id', 'current');
  expect(q.eq).toHaveBeenCalledWith('is_published', true);
});
it('names the town in each address the same way the report pages do', async () => {
  fixture([row]);
  communities.mockResolvedValue(new Map([['another', { kind: 'county', name: 'Boone', areaName: 'Watauga County', regionName: 'North Carolina', countryName: 'United States', countryCode: 'US' }]]));
  const [item] = await loadRelatedPublicReports('current', 36.2, -81.6);
  expect(item.path).toBe('/litter-reports/roadside-litter-boone-north-carolina-another');
});
it('makes no database request without a position', async () => {
  expect(await loadRelatedPublicReports('current')).toEqual([]);
  expect(createClient).not.toHaveBeenCalled();
});
it('keeps the report available when optional related links cannot load', async () => {
  fixture([], new Error('unavailable'));
  expect(await loadRelatedPublicReports('current', 36.2, -81.6)).toEqual([]);
});
it('returns at most three opportunities and three completed records without coordinates', async () => {
  fixture(Array.from({ length: 20 }, (_, i) => ({ ...row, id: String(i), cleanup_state: i % 2 ? 'available' : 'completed' })));
  const related = await loadRelatedPublicReports('current', 36.2, -81.6);
  expect(related).toHaveLength(6);
  expect(JSON.stringify(related)).not.toMatch(/latitude|longitude/);
  expect(related.filter(item => item.state === 'available')).toHaveLength(3);
});
