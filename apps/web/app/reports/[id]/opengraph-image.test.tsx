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
