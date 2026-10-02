import { beforeEach, describe, expect, it, vi } from 'vitest';

const { from, embed, loadImage, createPublicClient } = vi.hoisted(() => ({
  from: vi.fn(), embed: vi.fn(), loadImage: vi.fn(), createPublicClient: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/env', () => ({ getSiteUrl: () => 'https://litterbugs.app' }));
vi.mock('@/lib/supabase/public', () => ({ createPublicClient }));
vi.mock('@/lib/social-card-photo', () => ({ embedSocialCardPhoto: embed, loadSocialCardPhoto: loadImage }));

import { loadPublicReportPhoto, loadPublicReportShare } from './public-report-share';

const id = '11111111-1111-4111-8111-111111111111';
const beforePath = 'owner/report/before.heic';
const afterPath = 'cleaner/attempt/final.jpg';
const base = {
  id, title: 'Public cleanup', is_published: true, is_sample: false,
  cleanup_state: 'available', cancelled_at: null, expired_at: null,
  expires_at: '2099-01-01', photo_paths: [beforePath],
};
const queries = new Map<string, ReturnType<typeof query>>();
function query(data: unknown, error: unknown = null) {
  const q = {
    select: vi.fn(() => q), eq: vi.fn(() => q), not: vi.fn(() => q),
    order: vi.fn(() => q), limit: vi.fn(() => q),
    maybeSingle: vi.fn(async () => ({ data, error })),
  };
  return q;
}
function fixture(report: unknown = base) {
  queries.set('reports', query(report));
  queries.set('cleanup_attempts', query({ id: 'attempt', cleaner_id: 'cleaner', final_submission_id: 'final' }));
  queries.set('cleanup_submissions', query({ description: 'Cleaned', bags_or_items_removed: 2 }));
  queries.set('cleanup_submission_photos', query({ storage_path: afterPath }));
  queries.set('profiles', query({ display_name: 'Cleaner' }));
}
beforeEach(() => {
  vi.clearAllMocks(); queries.clear(); fixture();
  from.mockImplementation((table: string) => queries.get(table));
  createPublicClient.mockReturnValue({ from });
  embed.mockImplementation(async (_client, _bucket, path) => path ? 'data:image/jpeg;base64,AQID' : null);
  loadImage.mockImplementation(async (_client, _bucket, path) => path ? Buffer.from([1, 2, 3]) : null);
});

describe('public report photo delivery', () => {
  it('builds small HTML photo links without downloading, embedding, or disclosing storage paths', async () => {
    const report = await loadPublicReportShare(id, 'linked');
    expect(report?.beforePhotoUrl).toBe(`/reports/${id}/photo/before`);
    expect(report?.afterPhotoUrl).toBeNull();
    expect(JSON.stringify(report)).not.toContain(beforePath);
    expect(embed).not.toHaveBeenCalled(); expect(loadImage).not.toHaveBeenCalled();
    expect(queries.get('reports')?.eq).toHaveBeenCalledWith('is_published', true);
    expect(queries.get('reports')?.eq).toHaveBeenCalledWith('is_sample', false);
  });

  it('retains embedded before/after images for social cards', async () => {
    fixture({ ...base, cleanup_state: 'completed' });
    const report = await loadPublicReportShare(id);
    expect(report?.beforePhotoUrl).toMatch(/^data:image\/jpeg/);
    expect(report?.afterPhotoUrl).toMatch(/^data:image\/jpeg/);
    expect(embed).toHaveBeenCalledWith(expect.anything(), 'cleanup_photos', afterPath);
  });

  it('serves only the selected public photo, with completed evidence tied to its final submission', async () => {
    fixture({ ...base, cleanup_state: 'completed', expires_at: '2020-01-01' });
    expect(await loadPublicReportPhoto(id, 'after')).toEqual(Buffer.from([1, 2, 3]));
    expect(loadImage).toHaveBeenCalledExactlyOnceWith(expect.anything(), 'cleanup_photos', afterPath);
    expect(queries.get('cleanup_attempts')?.eq).toHaveBeenCalledWith('report_id', id);
    expect(queries.get('cleanup_attempts')?.eq).toHaveBeenCalledWith('status', 'completed');
    expect(queries.get('cleanup_submission_photos')?.eq).toHaveBeenCalledWith('submission_id', 'final');
    expect(embed).not.toHaveBeenCalled();
  });

  it.each(['claimed', 'completion_submitted', 'changes_requested'])('does not expose unfinished after-evidence for %s', async cleanup_state => {
    fixture({ ...base, cleanup_state });
    expect(await loadPublicReportPhoto(id, 'after')).toBeNull();
    expect(from).not.toHaveBeenCalledWith('cleanup_submission_photos');
    expect(loadImage).not.toHaveBeenCalled();
  });

  it.each([
    { is_published: false }, { is_sample: true }, { cancelled_at: '2026-01-01' },
    { expired_at: '2026-01-01' }, { expires_at: '2020-01-01' }, { cleanup_state: 'cancelled' },
  ])('does not load photos for an excluded report: %j', async changes => {
    fixture({ ...base, ...changes });
    expect(await loadPublicReportPhoto(id, 'before')).toBeNull();
    expect(await loadPublicReportShare(id, 'linked')).toBeNull();
    expect(loadImage).not.toHaveBeenCalled(); expect(embed).not.toHaveBeenCalled();
  });

  it('returns no image for an inaccessible record or missing final submission', async () => {
    fixture(null);
    expect(await loadPublicReportPhoto(id, 'before')).toBeNull();
    expect(loadImage).not.toHaveBeenCalled();
    fixture({ ...base, cleanup_state: 'completed' });
    queries.set('cleanup_attempts', query(null));
    expect(await loadPublicReportPhoto(id, 'after')).toBeNull();
    expect(from).not.toHaveBeenCalledWith('cleanup_submission_photos');
  });

  it('checks visibility again after the report is withdrawn', async () => {
    expect(await loadPublicReportPhoto(id, 'before')).not.toBeNull();
    fixture({ ...base, is_published: false });
    expect(await loadPublicReportPhoto(id, 'before')).toBeNull();
    expect(loadImage).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed IDs before database access and propagates access-check errors', async () => {
    expect(await loadPublicReportPhoto('../private', 'before')).toBeNull();
    expect(from).not.toHaveBeenCalled();
    queries.set('reports', query(null, new Error('unavailable')));
    await expect(loadPublicReportPhoto(id, 'before')).rejects.toThrow('unavailable');
    expect(loadImage).not.toHaveBeenCalled();
  });
});
