import { beforeEach, expect, it, vi } from 'vitest';
const { query, load } = vi.hoisted(() => ({ query: { select: vi.fn(), eq: vi.fn(), not: vi.fn(), order: vi.fn(), range: vi.fn() }, load: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('./supabase/public', () => ({ createPublicClient: () => ({ from: () => query }) }));
vi.mock('./public-report-share', () => ({ loadPublicReportShare: load }));
import { loadLatestCleanup } from './latest-cleanup';
beforeEach(() => {
  vi.resetAllMocks();
  for (const method of ['select', 'eq', 'not', 'order'] as const) query[method].mockReturnValue(query);
});
const complete = { id: 'older-report-recent-cleanup', state: 'completed', completionDate: '2026-10-29', beforePhotoUrl: '/before', afterPhotoUrl: '/after', reportDate: '2025-01-01' };
it('uses completion order and skips hidden reports and missing photos', async () => {
  query.range.mockResolvedValue({ data: [{ report_id: 'hidden' }, { report_id: 'missing-photo' }, { report_id: complete.id }], error: null });
  load.mockResolvedValueOnce(null).mockResolvedValueOnce({ ...complete, afterPhotoUrl: null }).mockResolvedValueOnce(complete);
  expect(await loadLatestCleanup()).toEqual(complete);
  expect(query.order).toHaveBeenCalledWith('completed_at', { ascending: false });
  expect(query.order).not.toHaveBeenCalledWith('created_at', expect.anything());
});
it('continues beyond one batch to find a photo pair', async () => {
  query.range.mockResolvedValueOnce({ data: Array.from({ length: 24 }, (_, i) => ({ report_id: String(i) })), error: null }).mockResolvedValueOnce({ data: [{ report_id: complete.id }], error: null });
  load.mockImplementation(async id => id === complete.id ? complete : null);
  expect(await loadLatestCleanup()).toEqual(complete);
  expect(query.range).toHaveBeenLastCalledWith(24, 47);
});
it('hides the feature on an outage or when no eligible cleanup exists', async () => {
  query.range.mockResolvedValueOnce({ data: null, error: new Error('unavailable') });
  expect(await loadLatestCleanup()).toBeNull();
  query.range.mockResolvedValueOnce({ data: [], error: null });
  expect(await loadLatestCleanup()).toBeNull();
});
