import { beforeEach, describe, expect, it, vi } from 'vitest';
import { historyClient, historyId } from '../test-support/historyClient';
const mocks = vi.hoisted(() => ({ client: null }));
vi.mock('./supabase', () => ({ supabase: { from: (...args) => mocks.client.from(...args) } }));
import { loadMyContributions, loadMyContribution } from './funding';
let fixture;
const rows = Array.from({ length: 81 }, (_, i) => ({
  id: historyId(i), contributor_id: 'owner', created_at: '2026-09-08T12:00:00.123456+00:00',
  status: ['payment_pending', 'failed', 'succeeded', 'refund_pending', 'refund_processing', 'refunded', 'paid_out'][i % 7],
  report: i % 7 === 5 ? null : { cleanup_state: i < 12 ? 'completed' : 'available' },
}));
beforeEach(() => { fixture = historyClient({ cleanup_contributions: rows }); mocks.client = fixture.client; });
describe('complete payment history', () => {
  it('loads beyond 50 records exactly once, including equal timestamps', async () => {
    const ids = []; let cursor = null;
    do {
      const page = await loadMyContributions({ userId: 'owner', cursor });
      ids.push(...page.items.map(row => row.id)); cursor = page.nextCursor;
    } while (cursor);
    expect(ids).toHaveLength(81);
    expect(new Set(ids).size).toBe(81);
    expect(ids[0]).toBe(historyId(80));
    expect(ids.at(-1)).toBe(historyId(0));
    expect(fixture.requests[0].searchParams.get('select')).not.toContain('!inner');
    expect(fixture.requests[0].searchParams.get('order')).toBe('created_at.desc,id.desc');
  });
  it('filters completed impact before pagination, including records beyond the newest 50', async () => {
    const result = await loadMyContributions({ userId: 'owner', completedOnly: true });
    expect(result.items.map(row => row.id)).toEqual(rows.filter(row => row.report?.cleanup_state === 'completed' && ['succeeded', 'paid_out'].includes(row.status)).reverse().map(row => row.id));
    expect(result.items.length).toBeGreaterThan(0);
    expect(fixture.requests[0].searchParams.get('select')).toContain('!inner');
  });
  it('keeps failed, refunded and missing-report transactions in All payments', async () => {
    const page = await loadMyContributions({ userId: 'owner' });
    expect(new Set(page.items.map(row => row.status)).size).toBe(7);
    expect(page.items.some(row => row.report === null)).toBe(true);
  });
  it('does not load another account or turn failure into an empty ledger', async () => {
    expect((await loadMyContributions({ userId: 'other' })).items).toEqual([]);
    fixture.fail();
    await expect(loadMyContributions({ userId: 'owner' })).rejects.toMatchObject({ message: 'offline' });
  });
  it('does not query account data without an account and scopes detail requests', async () => {
    expect(await loadMyContribution(historyId(1), null)).toBeNull();
    await loadMyContributions();
    expect(fixture.requests).toHaveLength(0);
    await loadMyContribution(historyId(1), 'owner');
    expect(fixture.requests[0].searchParams.get('contributor_id')).toBe('eq.owner');
  });
  it('rejects cursor syntax supplied outside the database', async () => {
    await expect(loadMyContributions({ userId: 'owner', cursor: { id: 'bad,syntax', created_at: 'today' } })).rejects.toThrow('Invalid history cursor');
  });
});
