import { describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ pages: [], calls: [] }));
vi.mock('./supabase', () => ({ supabase: { from: () => {
  const chain = { select: () => chain, eq: (...args) => { m.calls.push(args); return chain; }, order: () => chain,
    range: async () => m.pages.shift() };
  return chain;
} } }));
import { groupAccountReports, loadAccountReports } from './accountReports';
describe('personal report collection', () => {
  it('loads all owned pages without any geographic query', async () => {
    m.calls = []; m.pages = [{ data: Array.from({length: 500}, (_, i) => ({id: i})) }, { data: [{id: 'last'}] }];
    expect(await loadAccountReports('alice')).toHaveLength(501);
    expect(m.calls).toEqual([['user_id', 'alice'], ['is_sample', false], ['user_id', 'alice'], ['is_sample', false]]);
  });
  it('propagates errors instead of pretending there are no reports', async () => {
    m.pages = [{ error: Error('offline') }];
    await expect(loadAccountReports('alice')).rejects.toThrow('offline');
  });
  it('keeps completed impact separate from active and closed reports', () => {
    const reports = [{id: 'a', cleanup_state: 'available'}, {id: 'b', cleanup_state: 'claimed'}, {id: 'c', cleanup_state: 'completed', expires_at:'2020-01-01'}, {id:'d', expired_at:'2020-01-01'}, {id:'e', cancelled_at:'2020-01-01'}];
    const groups = groupAccountReports(reports);
    expect(groups.active.map(r=>r.id)).toEqual(['a','b']);
    expect(groups.completed.map(r=>r.id)).toEqual(['c']);
    expect(groups.closed.map(r=>r.id)).toEqual(['d','e']);
  });
});
