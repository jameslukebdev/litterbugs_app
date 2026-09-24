// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SharedReportPage from './page';
import type { PublicReportShareModel } from '@/lib/public-report-share-model';
const { loadReport } = vi.hoisted(() => ({ loadReport: vi.fn() }));
vi.mock('@/lib/public-report-share', () => ({ loadPublicReportShare: loadReport }));
afterEach(cleanup);
const report = {
  id: 'report-id', title: 'Creek cleanup', state: 'available', rewardCents: 600,
  litterTypes: ['Cans'], generalLocation: 'Open the report to view its location',
  reportDate: null, cleanerName: null, completionDate: null, cleanupDescription: null,
  bagsOrItemsRemoved: null, weightPounds: null, beforePhotoUrl: null, afterPhotoUrl: null,
  canonicalUrl: 'https://litterbugs.app/reports/report-id', severity: 'Low', notes: null,
} satisfies PublicReportShareModel;
describe('public shared report funding copy', () => {
  it('shows the actual reward on the visible page instead of labeling a funded cleanup volunteer-only', async () => {
    loadReport.mockResolvedValue(report);
    render(await SharedReportPage({ params: Promise.resolve({ id: report.id }) }));
    expect(screen.getByText(/This report has a \$6.00 cleanup reward/)).toBeTruthy();
    expect(screen.queryByText(/available for volunteer cleanup/)).toBeNull();
    expect(screen.getByRole('link', { name: 'Open in Litterbugs' }).getAttribute('href'))
      .toBe('litterbugs://reports/report-id');
  });
  it('includes an app link in server HTML before browser JavaScript runs', async () => {
    loadReport.mockResolvedValue(report);
    const html = renderToStaticMarkup(await SharedReportPage({ params: Promise.resolve({ id: report.id }) }));
    expect(html).toContain('href="litterbugs://reports/report-id"');
  });
  it('retains volunteer wording when there is no reward', async () => {
    loadReport.mockResolvedValue({ ...report, rewardCents: 0 });
    render(await SharedReportPage({ params: Promise.resolve({ id: report.id }) }));
    expect(screen.getByText(/available for volunteer cleanup/)).toBeTruthy();
  });
});
