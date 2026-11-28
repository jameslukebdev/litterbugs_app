import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import ReportImage from './opengraph-image';

const { loadReport } = vi.hoisted(() => ({ loadReport: vi.fn() }));
vi.mock('@/lib/public-report-share', () => ({ loadPublicReportShare: loadReport }));
vi.mock('@/lib/social-card-logo', () => ({ loadSocialCardLogo: async () => 'data:image/png;base64,AA==' }));
vi.mock('next/og', () => ({
  ImageResponse: class extends Response {
    constructor(element: ReactElement) { super(renderToStaticMarkup(element)); }
  },
}));

describe('public report preview image', () => {
  it.each([
    ['available', 600, '$6.00 CLEANUP REWARD'],
    ['available', 0, 'VOLUNTEER CLEANUP NEEDED'],
    ['completed', 600, 'CLEANUP COMPLETE'],
  ])('labels %s reports with %s cents correctly', async (state, rewardCents, expected) => {
    loadReport.mockResolvedValue({ id: 'report-id', title: 'Creek cleanup', state, rewardCents });
    const image = await ReportImage({ params: Promise.resolve({ id: 'report-id' }) });
    const markup = await image.text();
    expect(markup).toContain(expected);
    if (rewardCents) expect(markup).not.toContain('VOLUNTEER CLEANUP NEEDED');
  });
});

it('keeps completed preview photos before/after and preserves labels when a photo is missing', async () => {
  loadReport.mockResolvedValue({ title: 'Cleanup', state: 'completed', beforePhotoUrl: '/before.jpg', afterPhotoUrl: '/after.jpg' });
  const markup = await (await ReportImage({ params: Promise.resolve({ id: 'report-id' }) })).text();
  expect(markup.indexOf('src="/before.jpg"')).toBeLessThan(markup.indexOf('src="/after.jpg"'));
  loadReport.mockResolvedValue({ title: 'Cleanup', state: 'completed', afterPhotoUrl: '/after.jpg' });
  const missing = await (await ReportImage({ params: Promise.resolve({ id: 'report-id' }) })).text();
  expect(missing).toContain('AFTER');
  expect(missing).not.toContain('BEFORE');
});
it('returns an uncached 404 for removed report previews', async () => {
  loadReport.mockResolvedValue(null);
  const result = await ReportImage({ params: Promise.resolve({ id: 'report-id' }) });
  expect(result.status).toBe(404);
  expect(result.headers.get('Cache-Control')).toBe('private, no-store');
});
