import { beforeEach, expect, it, vi } from 'vitest';
const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('./supabase/public', () => ({ createPublicClient: () => ({ from }) }));
import { loadPublicReportIndex } from './public-report-index';

const base = {
  id: 'open', photo_paths: ['private-storage-path'], cleanup_state: 'available',
  cancelled_at: null, expired_at: null, expires_at: '2099-01-01', is_sample: false, is_published: true,
};
function query(data: unknown[], error: unknown = null) {
  const q = {
    select: vi.fn(() => q), eq: vi.fn(() => q), is: vi.fn(() => q), not: vi.fn(() => q),
    in: vi.fn(() => q), order: vi.fn(() => q), range: vi.fn(() => q),
    limit: vi.fn(() => q), gt: vi.fn(() => q),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data, error }).then(resolve),
  };
  return q;
}
beforeEach(() => vi.clearAllMocks());
it('only advertises photos for public reports and their latest completed final evidence', async () => {
  const reports = query([
    base, { ...base, id: 'done', cleanup_state: 'completed' },
    { ...base, id: 'missing', photo_paths: [], cleanup_state: 'completed' },
    { ...base, id: 'pending', cleanup_state: 'completion_submitted' },
    { ...base, id: 'expired', expires_at: '2020-01-01' },
    { ...base, id: 'private', is_published: false }, { ...base, id: 'sample', is_sample: true },
    { ...base, id: 'withdrawn', cancelled_at: '2026-01-01' },
  ]);
  const attempts = query([
    { report_id: 'done', final_submission_id: 'latest' },
    { report_id: 'done', final_submission_id: 'old' },
    { report_id: 'missing', final_submission_id: 'no-photo' },
  ]);
  const photos = query([{ submission_id: 'latest', storage_path: 'private-after-path' }]);
  from.mockImplementation(table => ({ reports, cleanup_attempts: attempts, cleanup_submission_photos: photos })[table as 'reports']);
  const index = await loadPublicReportIndex();
  expect(index).toEqual([
    { id: 'open', hasBeforePhoto: true, hasAfterPhoto: false },
    { id: 'done', hasBeforePhoto: true, hasAfterPhoto: true },
    { id: 'missing', hasBeforePhoto: false, hasAfterPhoto: false },
    { id: 'pending', hasBeforePhoto: true, hasAfterPhoto: false },
    { id: 'expired', hasBeforePhoto: true, hasAfterPhoto: false },
  ]);
  expect(attempts.in).toHaveBeenCalledWith('report_id', ['done', 'missing']);
  expect(attempts.eq).toHaveBeenCalledWith('status', 'completed');
  expect(photos.in).toHaveBeenCalledWith('submission_id', ['latest', 'no-photo']);
  expect(JSON.stringify(index)).not.toContain('private-');
});
it('continues beyond a full API page using the last candidate ID', async () => {
  const first = query(Array.from({ length: 1000 }, (_, i) => ({ ...base, id: String(i).padStart(4, '0') })));
  const second = query([{ ...base, id: '1000' }]);
  from.mockReturnValueOnce(first).mockReturnValueOnce(second);
  expect(await loadPublicReportIndex()).toHaveLength(1001);
  expect(second.gt).toHaveBeenCalledWith('id', '0999');
});
it('fails rather than returning a successful incomplete sitemap during an outage', async () => {
  from.mockReturnValue(query([], new Error('Backend unavailable')));
  await expect(loadPublicReportIndex()).rejects.toThrow('Backend unavailable');
});
it('does not advertise after photos when final evidence has no public photo', async () => {
  from.mockReturnValueOnce(query([{ ...base, cleanup_state: 'completed' }]))
    .mockReturnValueOnce(query([]));
  expect(await loadPublicReportIndex()).toEqual([{ id: 'open', hasBeforePhoto: true, hasAfterPhoto: false }]);
});
