import { beforeEach, expect, it, vi } from 'vitest';
import { isReportPublished } from './report-submission-state';

const query = vi.hoisted(() => ({ select: vi.fn(), eq: vi.fn(), abortSignal: vi.fn(), maybeSingle: vi.fn() }));
const from = vi.hoisted(() => vi.fn());
vi.mock('./supabase/client', () => ({ createClient: () => ({ from }) }));
beforeEach(() => {
  vi.resetAllMocks();
  from.mockReturnValue(query);
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.abortSignal.mockReturnValue(query);
});
it('confirms publication only for the exact submission owned by this account', async () => {
  query.maybeSingle.mockResolvedValue({ data: { id: 'beacon' }, error: null });
  expect(await isReportPublished('owner', 'beacon')).toBe(true);
  expect(from).toHaveBeenCalledWith('reports');
  expect(query.select).toHaveBeenCalledWith('id');
  expect(query.eq.mock.calls).toEqual([['id', 'beacon'], ['user_id', 'owner'], ['is_published', true]]);
});
it('does not retire a draft without a confirmed published report', async () => {
  query.maybeSingle.mockResolvedValue({ data: null, error: null });
  expect(await isReportPublished('owner', 'not-published')).toBe(false);
});
it('preserves recovery when the publication check fails', async () => {
  query.maybeSingle.mockResolvedValue({ data: null, error: new Error('Offline') });
  await expect(isReportPublished('owner', 'beacon')).rejects.toThrow('Offline');
});
