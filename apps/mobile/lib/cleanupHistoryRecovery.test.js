import { expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({ attempts: [], requests: [] }));
vi.mock('./supabase', () => ({ supabase: { from: table => {
  let from = 0, to = 499;
  const query = {
    select: () => query, eq: () => query, in: () => query, order: () => query,
    range: (a, b) => { from = a; to = b; return query; },
    then: (resolve) => { fixture.requests.push({table, from, to}); return Promise.resolve({ data: table === 'cleanup_attempts' ? fixture.attempts.slice(from,to+1) : [], error: null }).then(resolve); },
  }; return query;
} } }));
import { loadCurrentUserCleanupSummary } from './cleanup';
it('counts more than one API page and preserves completed work whose report is unavailable', async () => {
  fixture.attempts = Array.from({length: 1101}, (_, id) => ({ id: String(id), report_id: `report${id}`, status: 'completed', is_paid: true, reward_amount_cents: 600 }));
  fixture.requests = [];
  const summary = await loadCurrentUserCleanupSummary('cleaner');
  expect(summary.counts.completed).toBe(1101);
  expect(summary.completed).toHaveLength(1101);
  expect(summary.completed[0].report.title).toBe('Original report unavailable');
  expect(summary.completed.every(item => item.reward_amount_cents === 600)).toBe(true);
  expect(fixture.requests.filter(item => item.table === 'cleanup_attempts').map(item => item.from)).toEqual([0,500,1000]);
});
