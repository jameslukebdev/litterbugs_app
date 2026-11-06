// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SharedReportPage, { generateMetadata } from './page';
import type { PublicReportShareModel } from '@/lib/public-report-share-model';
const { loadReport, loadRelated } = vi.hoisted(() => ({ loadReport: vi.fn(), loadRelated: vi.fn().mockResolvedValue([]) }));
vi.mock('@/lib/related-public-reports', () => ({ loadRelatedPublicReports: loadRelated }));
vi.mock('@/components/public-site-header', () => ({ PublicSiteHeader: () => null }));
vi.mock('@/lib/public-report-share', () => ({ loadPublicReportShare: loadReport }));
vi.mock('@/components/public-account-action', () => ({ PublicAccountAction: () => <button>Sign in</button> }));
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
    expect(screen.getByText(/\$6.00 cleanup reward/)).toBeTruthy();
    expect(screen.queryByText(/Volunteer cleanup/)).toBeNull();
    expect(screen.getByRole('link', { name: 'Open in Litterbugs' }).getAttribute('href'))
      .toBe('litterbugs://reports/report-id');
  });
  it('includes an app link in server HTML before browser JavaScript runs', async () => {
    loadReport.mockResolvedValue(report);
    const html = renderToStaticMarkup(await SharedReportPage({ params: Promise.resolve({ id: report.id }) }));
    expect(html).toContain('href="litterbugs://reports/report-id"');
    expect(loadReport).toHaveBeenCalledWith(report.id, 'linked');
  });
  it('retains volunteer wording when there is no reward', async () => {
    loadReport.mockResolvedValue({ ...report, rewardCents: 0 });
    render(await SharedReportPage({ params: Promise.resolve({ id: report.id }) }));
    expect(screen.getByText(/Volunteer cleanup/)).toBeTruthy();
  });
  it('keeps the before/after layout and removes unavailable photos without a broken-image panel', async () => {
    loadReport.mockResolvedValue({ ...report, state: 'completed', beforePhotoUrl: '/photo/before', afterPhotoUrl: '/photo/after' });
    const { container } = render(await SharedReportPage({ params: Promise.resolve({ id: report.id }) }));
    expect(screen.getByAltText('Cleanup result photo for “Creek cleanup”').getAttribute('src')).toBe('/photo/after');
    expect(Array.from(container.querySelectorAll('figure img')).map(img => img.getAttribute('src'))).toEqual(['/photo/before', '/photo/after']);
    fireEvent.error(screen.getByAltText('Cleanup result photo for “Creek cleanup”'));
    expect(screen.queryByAltText('Cleanup result photo for “Creek cleanup”')).toBeNull();
    expect(container.querySelector('[class*="singlePhoto"]')).toBeTruthy();
    fireEvent.error(screen.getByAltText('Original report photo for “Creek cleanup”'));
    expect(screen.queryByText('Before')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: report.title })).toBeTruthy();
  });
});

it('connects an available Boone report to its own web funding and cleanup controls', async () => {
  loadReport.mockResolvedValue({ ...report, communitySlug: 'us-nc-boone', generalLocation: 'Boone', fundingEligible: true });
  render(await SharedReportPage({ params: Promise.resolve({ id: report.id }) }));
  for (const [name, intent] of [['Fund', 'fund'], ['Clean', 'clean']]) {
    const entry = new URL(screen.getByRole('link', { name }).getAttribute('href')!, 'https://litterbugs.app');
    expect(entry.pathname).toBe('/sign-in');
    const url = new URL(entry.searchParams.get('next')!, entry.origin);
    expect(url.pathname).toBe('/map');
    expect(url.searchParams.get('report')).toBe(report.id);
    expect(url.searchParams.get('intent')).toBe(intent);
    expect(url.searchParams.get('returnTo')).toBe('/communities/us/nc/boone');
  }
  expect(screen.getByRole('link', { name: 'Back to Boone' }).getAttribute('href')).toBe('/communities/us/nc/boone');
});
it.each(['completed', 'in_progress'])('does not offer a new cleanup or payment on a %s report', async state => {
  loadReport.mockResolvedValue({ ...report, state, communitySlug: 'us-nc-boone', fundingEligible: true });
  render(await SharedReportPage({ params: Promise.resolve({ id: report.id }) }));
  expect(screen.queryByRole('link', { name: 'Fund' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'Clean' })).toBeNull();
  expect(screen.getByRole('link', { name: 'View on map' })).toBeTruthy();
});
it('does not advertise funding when the report is ineligible', async () => {
  loadReport.mockResolvedValue({ ...report, communitySlug: 'us-nc-boone', fundingEligible: false });
  render(await SharedReportPage({ params: Promise.resolve({ id: report.id }) }));
  expect(screen.queryByRole('link', { name: 'Fund' })).toBeNull();
  expect(screen.getByRole('link', { name: 'Clean' })).toBeTruthy();
});
it('keeps completed Boone evidence connected to more local opportunities and results', async () => {
  loadReport.mockResolvedValue({ ...report, state: 'completed', communitySlug: 'us-nc-boone', generalLocation: 'Boone', completionDate: '2026-10-28T12:00:00Z', cleanerName: 'Local cleaner', bagsOrItemsRemoved: 2, weightPounds: 12 });
  render(await SharedReportPage({ params: Promise.resolve({ id: report.id }) }));
  expect(screen.getByRole('link', { name: 'Find another cleanup in Boone' }).getAttribute('href')).toBe('/communities/us/nc/boone/cleanups?status=available');
  expect(screen.getByRole('link', { name: 'Results in Boone' }).getAttribute('href')).toBe('/communities/us/nc/boone/cleanups?status=completed');
  expect(screen.getByText('Cleaned by Local cleaner')).toBeTruthy();
});

it('renders original context, cleanup evidence, dates and related report links in server HTML', async () => {
  loadReport.mockResolvedValue({ ...report, state: 'completed', communitySlug: 'us-nc-boone', localityLabel: 'Boone, North Carolina', notes: 'Cans beside the creek', cleanupDescription: 'Collected two bags', reportDate: '2026-10-28T12:00:00Z', completionDate: '2026-11-02T12:00:00Z', beforePhotoUrl: '/photo/before', afterPhotoUrl: '/photo/after' });
  loadRelated.mockResolvedValueOnce([{ id: 'another-report', title: 'Roadside litter', state: 'available' }]);
  const html = renderToStaticMarkup(await SharedReportPage({ params: Promise.resolve({ id: report.id }) }));
  expect(html).toContain('The original report');
  expect(html).toContain('Cans beside the creek');
  expect(html).toContain('Collected two bags');
  expect(html).toContain('href="/reports/another-report"');
  expect(html).toContain('near Boone, North Carolina');
  expect(html).toContain('dateTime="2026-11-02T12:00:00Z"');
  expect(html).toContain('Original report photo for');
  expect(html).toContain('Reported October 28, 2026');
});
it('aligns search and sharing metadata with verified locality and available evidence', async () => {
  loadReport.mockResolvedValue({ ...report, state: 'completed', communitySlug: 'us-nc-boone', localityLabel: 'Boone, North Carolina' });
  const metadata = await generateMetadata({ params: Promise.resolve({ id: report.id }) });
  expect(metadata.title).toBe('Creek cleanup — Completed cleanup near Boone, North Carolina | Litterbugs');
  expect(metadata.description).not.toContain('before-and-after');
  expect(metadata.openGraph).toMatchObject({ title: 'Creek cleanup — Completed cleanup near Boone, North Carolina', description: metadata.description });
  expect(metadata.alternates?.canonical).toBe(report.canonicalUrl);
});
it('marks unavailable report metadata noindex', async () => {
  loadReport.mockResolvedValue(null);
  expect((await generateMetadata({ params: Promise.resolve({ id: report.id }) })).robots).toEqual({ index: false, follow: false });
});

it('keeps an expired report readable without advertising current cleanup, funding or app actions', async () => {
  loadReport.mockResolvedValue({ ...report, state: 'expired', expiredDate: '2026-10-01T12:00:00Z', fundingEligible: true, rewardCents: 1000, communitySlug: 'us-nc-boone' });
  render(await SharedReportPage({ params: Promise.resolve({ id: report.id }) }));
  expect(screen.getByText('Report expired')).toBeTruthy();
  expect(screen.getByText(/A cleanup has not been confirmed/)).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Find a current cleanup' }).getAttribute('href')).toBe('/reports');
  for (const name of ['Fund', 'Clean', 'Open in Litterbugs', 'View on map']) expect(screen.queryByRole('link', { name })).toBeNull();
  expect(screen.queryByText(/cleanup reward/)).toBeNull();
});
