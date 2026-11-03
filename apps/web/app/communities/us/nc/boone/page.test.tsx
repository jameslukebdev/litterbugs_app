import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ feed: vi.fn() }));
vi.mock('@/lib/public-report-feed', () => ({ loadPublicReportFeed: mocks.feed }));
vi.mock('@/lib/public-communities', () => ({ communities: [{ slug: 'us-nc-boone', source: 'https://example.com/boundary' }] }));
vi.mock('@/components/communities/community-controls', () => ({ SaveCommunity: () => null, ResourceDirectory: () => null }));
vi.mock('@/components/public-website', () => ({
  Website: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ReportCards: ({ feed }: { feed: { reports: { id: string }[] } }) => <div>{feed.reports.map(report => <a key={report.id} href={`/reports/${report.id}`}>{report.id}</a>)}</div>,
  CleanupProof: ({ report }: { report: { id: string } }) => <a href={`/reports/${report.id}`}>{report.id}</a>,
  styles: { wide: 'wide' },
}));
import Page from './page';
beforeEach(() => { vi.clearAllMocks(); });
it('shows a single available collection and a unique completed proof, with funding as a filtered destination', async () => {
  mocks.feed.mockImplementation(async (kind: string) => ({ unavailable: false, hasMore: true, reports: kind === 'available' ? [{ id: 'open-report' }] : [{ id: 'proof', state: 'completed', title: 'Completed work', beforePhotoUrl: '/before', afterPhotoUrl: '/after', completionDate: '2026-10-28T12:00:00Z' }, { id: 'another-result', state: 'completed', title: 'Other work' }] }));
  const html = renderToStaticMarkup(await Page());
  expect(mocks.feed.mock.calls.map(call => call[0])).toEqual(['available', 'completed']);
  expect(html.match(/href="\/reports\/open-report"/g)).toHaveLength(1);
  expect(html.match(/href="\/reports\/proof"/g)).toHaveLength(1);
  expect(html).not.toContain('id="local-funding"');
  expect(html).not.toContain('Support the platform');
  expect(html).not.toContain('Offer practical help');
  expect(html).not.toContain('Explore nearby');
  expect(html).not.toContain('How do I plan a small neighborhood cleanup?');
  expect(html).toContain('Oct 28, 2026');
  expect(html).toContain('/communities/us/nc/boone/cleanups?status=fundable');
  expect(html).toContain('/report?community=us-nc-boone&amp;area=community-us-nc-boone&amp;returnTo=');
});
