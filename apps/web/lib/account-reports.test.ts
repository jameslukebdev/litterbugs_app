import { describe, expect, it, vi } from 'vitest';
import type { Report } from '@litterbugs/report-contract';
import { loadAccountReports, accountReportStatus } from './account-reports';
const { range, eq, order } = vi.hoisted(() => ({ range: vi.fn(), eq: vi.fn(), order: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => {
  const query = { select: () => query, eq: (...args: unknown[]) => { eq(...args); return query; }, order: (...args: unknown[]) => { order(...args); return query; }, range };
  return { from: () => query };
} }));
describe('personal report history parity', () => {
  it('loads beyond discovery and page limits with a stable ordering', async () => {
    range.mockResolvedValueOnce({ data: Array.from({ length: 500 }, (_, id) => ({ id: String(id) })), error: null })
      .mockResolvedValueOnce({ data: [{ id: 'last' }], error: null });
    const result = await loadAccountReports('owner');
    expect(result.data).toHaveLength(501);
    expect(range).toHaveBeenNthCalledWith(1, 0, 499);
    expect(range).toHaveBeenNthCalledWith(2, 500, 999);
    expect(eq).toHaveBeenCalledWith('user_id', 'owner');
    expect(eq).toHaveBeenCalledWith('is_sample', false);
    expect(eq).toHaveBeenCalledWith('is_published', true);
    expect(order).toHaveBeenCalledWith('id');
  });
  it('does not present a partial count as complete after a page fails', async () => {
    range.mockResolvedValueOnce({ data: [], error: new Error('offline') });
    expect((await loadAccountReports('owner')).data).toBeNull();
  });
  it('keeps completed reports in history when their original expiry passes', () => {
    const expired = { expires_at: '2020-01-01', cleanup_state: 'completed' } as Report;
    expect(accountReportStatus(expired)).toBe('Completed');
    expect(accountReportStatus({ ...expired, cleanup_state: 'available' })).toBe('Closed');
  });
});
