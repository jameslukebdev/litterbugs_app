import { expect, it, vi } from 'vitest';
import { collectReportPage, reportFeedStateMatches } from './public-report-feed-page';

it('finds matches beyond 100 candidates and paginates after boundary/visibility filtering', async () => {
  const rows = Array.from({ length: 320 }, (_, n) => n);
  const fetch = vi.fn(async (offset: number, size: number) => rows.slice(offset, offset + size));
  const accepts = (n: number) => n >= 205 && n <= 210;
  const load = vi.fn(async (n: number) => n === 207 ? null : { id: n });
  const first = await collectReportPage(fetch, accepts, load, 2, 1);
  expect(first).toEqual({ reports: [{ id: 205 }, { id: 206 }], hasMore: true });
  expect(fetch).toHaveBeenCalledWith(200, 200);
  expect(await collectReportPage(fetch, accepts, load, 2, 2)).toEqual({ reports: [{ id: 208 }, { id: 209 }], hasMore: true });
  expect(await collectReportPage(fetch, accepts, load, 2, 3)).toEqual({ reports: [{ id: 210 }], hasMore: false });
});
it('stops at the lookahead match instead of hydrating an entire candidate batch', async () => {
  const load = vi.fn(async (n: number) => ({ id: n }));
  const result = await collectReportPage(async () => Array.from({ length: 200 }, (_, n) => n), () => true, load, 6, 1);
  expect(result.reports).toHaveLength(6);
  expect(load).toHaveBeenCalledTimes(7);
});
it('propagates outages rather than treating them as an empty local area', async () => {
  await expect(collectReportPage(async () => { throw Error('Unavailable'); }, () => true, async () => null, 6, 1)).rejects.toThrow('Unavailable');
});

it('rejects a report whose workflow changed between candidate fetch and hydration', () => {
  expect(reportFeedStateMatches('available', 'completed')).toBe(false);
  expect(reportFeedStateMatches('available', 'in_progress')).toBe(false);
  expect(reportFeedStateMatches('fundable', 'in_progress')).toBe(false);
  expect(reportFeedStateMatches('completed', 'available')).toBe(false);
  expect(reportFeedStateMatches('completed', 'completed')).toBe(true);
});

it('rechecks funding eligibility after hydration so held or frozen reports are omitted', () => {
  expect(reportFeedStateMatches('fundable', 'available', false)).toBe(false);
  expect(reportFeedStateMatches('fundable', 'available', true)).toBe(true);
  expect(reportFeedStateMatches('available', 'available', false)).toBe(true);
});

it('includes work underway in the open directory without including completed reports', () => {
  expect(reportFeedStateMatches('open', 'available')).toBe(true);
  expect(reportFeedStateMatches('open', 'in_progress')).toBe(true);
  expect(reportFeedStateMatches('open', 'completed')).toBe(false);
});

it('separates historical reports from every active or completed feed', () => {
  expect(reportFeedStateMatches('history', 'expired')).toBe(true);
  expect(reportFeedStateMatches('history', 'available')).toBe(false);
  for (const kind of ['open', 'recent', 'available', 'fundable', 'completed'] as const) expect(reportFeedStateMatches(kind, 'expired')).toBe(false);
});
