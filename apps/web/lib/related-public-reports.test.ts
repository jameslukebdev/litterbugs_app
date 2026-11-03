import { beforeEach, expect, it, vi } from 'vitest';
const { createClient, point, bounds } = vi.hoisted(() => ({
  createClient: vi.fn(), point: vi.fn(), bounds: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('./supabase/public', () => ({ createPublicClient: createClient }));
vi.mock('./public-communities', () => ({ communityBounds: bounds, publicCommunityForPoint: point }));
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
  bounds.mockReturnValue({ south: 36, north: 37, west: -82, east: -81 });
  point.mockImplementation(latitude => latitude === 36.2 ? { slug: 'us-nc-boone' } : null);
});

it('excludes the current report, private/sample/withdrawn/expired rows and points outside the actual boundary', async () => {
  const q = fixture([
    row, { ...row, id: 'current' }, { ...row, id: 'private', is_published: false },
    { ...row, id: 'sample', is_sample: true }, { ...row, id: 'cancelled', cancelled_at: '2026-01-01' },
    { ...row, id: 'expired', expires_at: '2020-01-01' }, { ...row, id: 'closed', expired_at: '2026-01-01' },
    { ...row, id: 'outside', latitude: 36.5 }, { ...row, id: 'pending', cleanup_state: 'completion_submitted' },
    { ...row, id: 'completed', cleanup_state: 'completed', expires_at: '2020-01-01' },
  ]);
  expect(await loadRelatedPublicReports('current', 'us-nc-boone')).toEqual([
    { id: 'another', title: 'Roadside litter', state: 'available' },
    { id: 'completed', title: 'Roadside litter', state: 'completed' },
  ]);
  expect(q.neq).toHaveBeenCalledWith('id', 'current');
  expect(q.eq).toHaveBeenCalledWith('is_published', true);
  expect(q.limit).toHaveBeenCalledWith(24);
});
it('makes no database request without a verified community boundary', async () => {
  bounds.mockReturnValue(null);
  expect(await loadRelatedPublicReports('current')).toEqual([]);
  expect(createClient).not.toHaveBeenCalled();
});
it('keeps the report available when optional related links cannot load', async () => {
  fixture([], new Error('unavailable'));
  expect(await loadRelatedPublicReports('current', 'us-nc-boone')).toEqual([]);
});
it('returns at most three opportunities and three completed records without coordinates', async () => {
  fixture(Array.from({ length: 20 }, (_, i) => ({ ...row, id: String(i), cleanup_state: i % 2 ? 'available' : 'completed' })));
  const related = await loadRelatedPublicReports('current', 'us-nc-boone');
  expect(related).toHaveLength(6);
  expect(JSON.stringify(related)).not.toMatch(/latitude|longitude/);
  expect(related.filter(item => item.state === 'available')).toHaveLength(3);
});
