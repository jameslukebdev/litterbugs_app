import { beforeEach, expect, it, vi } from 'vitest';
const { from, loadReport } = vi.hoisted(() => ({ from: vi.fn(), loadReport: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('./supabase/public', () => ({ createPublicClient: () => ({ from }) }));
vi.mock('./public-report-share', () => ({ loadPublicReportShare: loadReport }));
vi.mock('./public-communities', () => ({ communityBounds: () => null, publicCommunityForPoint: () => null }));
import { loadPublicReportFeed } from './public-report-feed';

function fixture(error: unknown = null) {
  const q = {
    select: vi.fn(() => q), eq: vi.fn(() => q), is: vi.fn(() => q), or: vi.fn(() => q),
    in: vi.fn(() => q), order: vi.fn(() => q),
    range: vi.fn().mockResolvedValue({ data: ['one', 'changed', 'withdrawn', 'two', 'three'].map(id => ({ id })), error }),
  };
  from.mockReturnValue(q);
  loadReport.mockImplementation(async id => id === 'withdrawn' ? null : {
    id, state: id === 'changed' ? 'completed' : id === 'two' ? 'in_progress' : 'available',
  });
  return q;
}
beforeEach(() => vi.clearAllMocks());
it('keeps completed and withdrawn reports out while filling the directory page with open work', async () => {
  const q = fixture();
  const feed = await loadPublicReportFeed('open', 2, 1);
  expect(feed.reports.map(report => report.id)).toEqual(['one', 'two']);
  expect(feed.hasMore).toBe(true);
  expect(q.in).toHaveBeenCalledWith('cleanup_state', ['available', 'claimed', 'completion_submitted', 'changes_requested']);
  expect(q.or).toHaveBeenCalledWith(expect.stringContaining('expires_at.is.null'));
  expect(q.eq).toHaveBeenCalledWith('is_published', true);
  expect(q.eq).toHaveBeenCalledWith('is_sample', false);
  expect(q.is).toHaveBeenCalledWith('expired_at', null);
});
it('paginates after visibility and state checks without duplicates', async () => {
  fixture();
  const feed = await loadPublicReportFeed('open', 2, 2);
  expect(feed.reports.map(report => report.id)).toEqual(['three']);
  expect(feed.hasMore).toBe(false);
});
it('reports a temporary outage separately from an empty directory', async () => {
  fixture(new Error('Unavailable'));
  expect(await loadPublicReportFeed('open', 12, 1)).toEqual({ reports: [], hasMore: false, unavailable: true });
});
