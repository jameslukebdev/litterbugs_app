import { expect, it, vi } from 'vitest';
import { collectCommunityPage, communityFeedStateMatches } from './community-feed-page';

it('finds matches beyond 100 candidates and paginates after boundary/visibility filtering', async () => {
  const rows = Array.from({ length: 320 }, (_, n) => n);
  const fetch = vi.fn(async (offset: number, size: number) => rows.slice(offset, offset + size));
  const accepts = (n: number) => n >= 205 && n <= 210;
  const load = vi.fn(async (n: number) => n === 207 ? null : { id: n });
  const first = await collectCommunityPage(fetch, accepts, load, 2, 1);
  expect(first).toEqual({ reports: [{ id: 205 }, { id: 206 }], hasMore: true });
  expect(fetch).toHaveBeenCalledWith(200, 200);
  expect(await collectCommunityPage(fetch, accepts, load, 2, 2)).toEqual({ reports: [{ id: 208 }, { id: 209 }], hasMore: true });
  expect(await collectCommunityPage(fetch, accepts, load, 2, 3)).toEqual({ reports: [{ id: 210 }], hasMore: false });
});
it('stops at the lookahead match instead of hydrating an entire candidate batch', async () => {
  const load = vi.fn(async (n: number) => ({ id: n }));
  const result = await collectCommunityPage(async () => Array.from({ length: 200 }, (_, n) => n), () => true, load, 6, 1);
  expect(result.reports).toHaveLength(6);
  expect(load).toHaveBeenCalledTimes(7);
});
it('propagates outages rather than treating them as an empty local area', async () => {
  await expect(collectCommunityPage(async () => { throw Error('Unavailable'); }, () => true, async () => null, 6, 1)).rejects.toThrow('Unavailable');
});

it('rejects a report whose workflow changed between candidate fetch and hydration', () => {
  expect(communityFeedStateMatches('available', 'completed')).toBe(false);
  expect(communityFeedStateMatches('available', 'in_progress')).toBe(false);
  expect(communityFeedStateMatches('fundable', 'in_progress')).toBe(false);
  expect(communityFeedStateMatches('completed', 'available')).toBe(false);
  expect(communityFeedStateMatches('completed', 'completed')).toBe(true);
});

it('rechecks funding eligibility after hydration so held or frozen reports are omitted', () => {
  expect(communityFeedStateMatches('fundable', 'available', false)).toBe(false);
  expect(communityFeedStateMatches('fundable', 'available', true)).toBe(true);
  expect(communityFeedStateMatches('available', 'available', false)).toBe(true);
});

it('includes work underway in the open directory without including completed reports', () => {
  expect(communityFeedStateMatches('open', 'available')).toBe(true);
  expect(communityFeedStateMatches('open', 'in_progress')).toBe(true);
  expect(communityFeedStateMatches('open', 'completed')).toBe(false);
});

it('separates historical reports from every active or completed feed', () => {
  expect(communityFeedStateMatches('history', 'expired')).toBe(true);
  expect(communityFeedStateMatches('history', 'available')).toBe(false);
  for (const kind of ['open', 'recent', 'available', 'fundable', 'completed'] as const) expect(communityFeedStateMatches(kind, 'expired')).toBe(false);
});
