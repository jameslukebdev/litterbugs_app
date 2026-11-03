import { beforeEach, expect, it, vi } from 'vitest';
const { loadFeed } = vi.hoisted(() => ({ loadFeed: vi.fn() }));
vi.mock('./public-report-feed', () => ({ loadPublicReportFeed: loadFeed }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND'); } }));
import { loadHistoricalReportDirectory, loadOpenReportDirectory, openReportPage } from './open-report-directory';
beforeEach(() => vi.clearAllMocks());
it('rejects malformed and repeated page parameters', () => {
  expect(openReportPage(undefined)).toBe(1);
  expect(openReportPage('2')).toBe(2);
  for (const value of ['0', '-1', 'abc', '01', ['1', '2']]) expect(() => openReportPage(value)).toThrow('NOT_FOUND');
});
it('loads twelve open reports and keeps a real empty first page', async () => {
  loadFeed.mockResolvedValue({ reports: [], hasMore: false, unavailable: false });
  expect(await loadOpenReportDirectory(1)).toHaveProperty('reports', []);
  expect(loadFeed).toHaveBeenCalledWith('open', 12, 1);
});
it('distinguishes a nonexistent page from a temporary outage', async () => {
  loadFeed.mockResolvedValue({ reports: [], hasMore: false, unavailable: false });
  await expect(loadOpenReportDirectory(2)).rejects.toThrow('NOT_FOUND');
  loadFeed.mockResolvedValue({ reports: [], hasMore: false, unavailable: true });
  expect(await loadOpenReportDirectory(2)).toHaveProperty('unavailable', true);
});

it('loads archived history independently of current cleanup opportunities', async () => {
  loadFeed.mockResolvedValue({ reports: [{ id: 'past', state: 'expired' }], hasMore: false, unavailable: false });
  expect(await loadHistoricalReportDirectory(1)).toHaveProperty('reports', [{ id: 'past', state: 'expired' }]);
  expect(loadFeed).toHaveBeenCalledWith('history', 12, 1);
});
