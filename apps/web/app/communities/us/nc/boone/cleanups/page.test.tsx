import React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
const mocks = vi.hoisted(() => ({ feed: vi.fn(), cards: vi.fn() }));
vi.mock('next/navigation', () => ({ notFound: () => { throw Error('NOT_FOUND'); } }));
vi.mock('@/lib/public-report-feed', () => ({ loadPublicReportFeed: mocks.feed }));
vi.mock('@/components/public-website', () => ({
  Website: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ReportCards: (props: unknown) => { mocks.cards(props); return <div>Report cards</div>; },
  styles: { wide: 'wide' },
}));
import Page, { generateMetadata } from './page';
beforeEach(() => { vi.clearAllMocks(); });
it('keeps a later-page outage distinct from an empty page and offers retry', async () => {
  mocks.feed.mockResolvedValue({ reports: [], hasMore: false, unavailable: true });
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ page: '2' }) }));
  expect(html).toContain('Reports couldn’t load right now.');
  expect(html).toContain('Try again');
  expect(html).not.toContain('0 reports shown');
  expect(mocks.cards).not.toHaveBeenCalled();
});
it('returns not-found for an exhausted healthy page but rejects malformed paging first', async () => {
  mocks.feed.mockResolvedValue({ reports: [], hasMore: false, unavailable: false });
  await expect(Page({ searchParams: Promise.resolve({ page: '2' }) })).rejects.toThrow('NOT_FOUND');
  mocks.feed.mockClear();
  await expect(Page({ searchParams: Promise.resolve({ page: '0' }) })).rejects.toThrow('NOT_FOUND');
  expect(mocks.feed).not.toHaveBeenCalled();
});
it('keeps the local status in next/previous links and excludes listing variants from indexing', async () => {
  mocks.feed.mockResolvedValue({ reports: [{ id: 'example' }], hasMore: true, unavailable: false });
  const searchParams = Promise.resolve({ page: '2', status: 'completed' });
  const html = renderToStaticMarkup(await Page({ searchParams }));
  expect(mocks.feed).toHaveBeenCalledWith('completed', 6, 2, 'us-nc-boone');
  expect(html).toContain('/communities/us/nc/boone/cleanups?status=completed&amp;page=3');
  expect(html).toContain('Previous page');
  expect((await generateMetadata({ searchParams })).robots).toEqual({ index: false, follow: true });
});
