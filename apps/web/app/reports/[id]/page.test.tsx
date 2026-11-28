// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SharedReportPage, { generateMetadata } from './page';
import type { PublicReportShareModel } from '@/lib/public-report-share-model';
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
const { loadSite } = vi.hoisted(() => ({ loadSite: vi.fn().mockResolvedValue(null) }));
vi.mock('@/lib/report-site', () => ({ loadReportSite: loadSite }));
const { loadReport, loadRelated } = vi.hoisted(() => ({ loadReport: vi.fn(), loadRelated: vi.fn().mockResolvedValue([]) }));
vi.mock('@/lib/related-public-reports', () => ({ loadRelatedPublicReports: loadRelated }));
vi.mock('@/components/public-site-header', () => ({ PublicSiteHeader: () => null }));
vi.mock('@/lib/public-report-share', () => ({ loadPublicReportShare: loadReport }));
vi.mock('@/lib/server-contributor-credits', () => ({
  withServerContributorCredits: async (reports: PublicReportShareModel[]) => reports.map(report => ({ ...report, contributorCredit: report.contributorCredit ?? null })),
}));
vi.mock('@/components/public-account-action', () => ({ PublicAccountAction: () => <button>Sign in</button> }));
const { tipLinks } = vi.hoisted(() => ({ tipLinks: vi.fn().mockResolvedValue({}) }));
vi.mock('@/lib/tips-server', () => ({ leaderboardTipLinks: tipLinks }));
vi.mock('@/components/community-rank', () => ({ CommunityRank: () => null }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: {
  getUser: async () => ({ data: { user: null } }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
} }) }));
afterEach(cleanup);
const report = {
  id: 'report-id', title: 'Creek cleanup', state: 'available', rewardCents: 600,
  litterTypes: ['Cans'], generalLocation: 'Open the report to view its location',
  reportDate: null, cleanerName: null, completionDate: null, cleanupDescription: null,
  bagsOrItemsRemoved: null, weightPounds: null, beforePhotoUrl: null, afterPhotoUrl: null,
  canonicalUrl: 'https://litterbugs.app/reports/report-id', severity: 'Low', notes: null,
} satisfies PublicReportShareModel;
describe('public shared report funding copy', () => {
  it('includes donor names and amounts in the initial report HTML', async () => {
    loadReport.mockResolvedValue({ ...report, contributorCredit: {
      report_id: report.id, names: ['Website Donor'], anonymous_count: 0,
      donations: [{ name: 'Website Donor', amountCents: 600, donatedAt: '2026-11-19T16:00:00Z' }],
    } });
    const html = renderToStaticMarkup(await SharedReportPage({ params: Promise.resolve({ id: report.id }) }));
    expect(html).toContain('Website Donor');
    expect(html).toContain('$6.00');
    expect(html).toContain('dateTime="2026-11-19T16:00:00Z"');
  });
  it('shows the actual reward on the visible page instead of labeling a funded cleanup volunteer-only', async () => {
    loadReport.mockResolvedValue(report);
    render(await SharedReportPage({ params: Promise.resolve({ id: report.id }) }));
    expect(screen.getByText(/\$6.00 in its cleanup fund/)).toBeTruthy();
    expect(screen.queryByText(/Volunteer cleanup/)).toBeNull();
    expect(screen.getByRole('link', { name: 'Open in Litterbugs' }).getAttribute('href'))
      .toBe('/get-app?report=report-id');
  });
  it('includes the report download link in server HTML before browser JavaScript runs', async () => {
    loadReport.mockResolvedValue(report);
    const html = renderToStaticMarkup(await SharedReportPage({ params: Promise.resolve({ id: report.id }) }));
    expect(html).toContain('href="/get-app?report=report-id"');
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
    await act(async () => { fireEvent.error(screen.getByAltText('Cleanup result photo for “Creek cleanup”')); });
    expect(screen.queryByAltText('Cleanup result photo for “Creek cleanup”')).toBeNull();
    expect(container.querySelector('[class*="singlePhoto"]')).toBeTruthy();
    await act(async () => { fireEvent.error(screen.getByAltText('Original report photo for “Creek cleanup”')); });
    expect(screen.queryByText('Before')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: report.title })).toBeTruthy();
  });
});

it('connects an available Boone report to its own web funding and cleanup controls', async () => {
  loadReport.mockResolvedValue({ ...report, community: { slug: 'us-nc-boone', path: '/communities/us/nc/boone', name: 'Boone' }, place: { locality: 'Boone', region: 'North Carolina', countryCode: 'US' }, generalLocation: 'Boone', fundingEligible: true });
  render(await SharedReportPage({ params: Promise.resolve({ id: report.id }) }));
  for (const [name, intent] of [['Fund', 'fund'], ['Clean', 'clean']]) {
    const entry = new URL(screen.getByRole('link', { name }).getAttribute('href')!, 'https://litterbugs.app');
    expect(entry.pathname).toBe('/sign-in');
    const url = new URL(entry.searchParams.get('next')!, entry.origin);
    expect(url.pathname).toBe('/map');
    expect(url.searchParams.get('report')).toBe(report.id);
    expect(url.searchParams.get('intent')).toBe(intent);
    expect(url.searchParams.has('returnTo')).toBe(false);
  }
  expect(screen.getAllByRole('link', { name: 'Boone leaderboard' }).map(link => link.getAttribute('href'))).toEqual(['/communities/us/nc/boone', '/communities/us/nc/boone']);
});
it.each(['completed', 'in_progress'])('does not offer a new cleanup or payment on a %s report', async state => {
  loadReport.mockResolvedValue({ ...report, state, community: { slug: 'us-nc-boone', path: '/communities/us/nc/boone', name: 'Boone' }, place: { locality: 'Boone', region: 'North Carolina', countryCode: 'US' }, fundingEligible: true });
  render(await SharedReportPage({ params: Promise.resolve({ id: report.id }) }));
  expect(screen.queryByRole('link', { name: 'Fund' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'Clean' })).toBeNull();
  expect(screen.getByRole('link', { name: 'View on map' })).toBeTruthy();
});
it('does not advertise funding when the report is ineligible', async () => {
  loadReport.mockResolvedValue({ ...report, community: { slug: 'us-nc-boone', path: '/communities/us/nc/boone', name: 'Boone' }, place: { locality: 'Boone', region: 'North Carolina', countryCode: 'US' }, fundingEligible: false });
  render(await SharedReportPage({ params: Promise.resolve({ id: report.id }) }));
  expect(screen.queryByRole('link', { name: 'Fund' })).toBeNull();
  expect(screen.getByRole('link', { name: 'Clean' })).toBeTruthy();
});
it('keeps completed Boone evidence focused on the cleanup and town leaderboard', async () => {
  loadReport.mockResolvedValue({ ...report, state: 'completed', community: { slug: 'us-nc-boone', path: '/communities/us/nc/boone', name: 'Boone' }, place: { locality: 'Boone', region: 'North Carolina', countryCode: 'US' }, generalLocation: 'Boone', completionDate: '2026-10-28T12:00:00Z', cleanerName: 'Local cleaner', bagsOrItemsRemoved: 2, weightPounds: 12 });
  render(await SharedReportPage({ params: Promise.resolve({ id: report.id }) }));
  expect(screen.queryByRole('link', { name: 'Find another cleanup' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Share cleanup' })).toBeTruthy();
  expect(screen.getAllByRole('link', { name: 'Boone leaderboard' }).every(link => link.getAttribute('href') === '/communities/us/nc/boone')).toBe(true);
  expect(screen.getByText('Cleaned by Local cleaner')).toBeTruthy();
});

it('renders original context, cleanup evidence, dates and related report links in server HTML', async () => {
  loadReport.mockResolvedValue({ ...report, state: 'completed', community: { slug: 'us-nc-boone', path: '/communities/us/nc/boone', name: 'Boone' }, place: { locality: 'Boone', region: 'North Carolina', countryCode: 'US' }, localityLabel: 'Boone, North Carolina', notes: 'Cans beside the creek', cleanupDescription: 'Collected two bags', reportDate: '2026-10-28T12:00:00Z', completionDate: '2026-11-02T12:00:00Z', beforePhotoUrl: '/photo/before', afterPhotoUrl: '/photo/after' });
  loadRelated.mockResolvedValueOnce([{ id: 'another-report', title: 'Roadside litter', state: 'available' }]);
  const html = renderToStaticMarkup(await SharedReportPage({ params: Promise.resolve({ id: report.id }) }));
  expect(html).toContain('The original report');
  expect(html).toContain('Cans beside the creek');
  expect(html).toContain('Collected two bags');
  expect(html).toContain('near Boone, North Carolina');
  expect(html).toContain('dateTime="2026-11-02T12:00:00Z"');
  expect(html).toContain('Original report photo for');
  expect(html).toContain('Reported October 28, 2026');
});

it('shows the report before slow optional recommendations resolve, then streams those links', async () => {
  loadReport.mockResolvedValue({ ...report, state: 'completed', community: { slug: 'us-nc-boone', path: '/communities/us/nc/boone', name: 'Boone' }, place: { locality: 'Boone', region: 'North Carolina', countryCode: 'US' } });
  let finish!: (rows: Array<{ id: string; title: string; state: 'available' }>) => void;
  loadRelated.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const page = await SharedReportPage({ params: Promise.resolve({ id: report.id }) });
  await act(async () => { render(page); });
  expect(screen.getByRole('heading', { level: 1, name: report.title })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'View on map' })).toBeTruthy();
  expect(screen.queryByRole('link', { name: 'Roadside litter' })).toBeNull();
  await act(async () => { finish([{ id: 'another-report', title: 'Roadside litter', state: 'available' }]); });
  expect((await screen.findByRole('link', { name: 'Roadside litter' })).getAttribute('href')).toBe('/reports/another-report');
});
it('aligns search and sharing metadata with verified locality and available evidence', async () => {
  loadReport.mockResolvedValue({ ...report, state: 'completed', community: { slug: 'us-nc-boone', path: '/communities/us/nc/boone', name: 'Boone' }, place: { locality: 'Boone', region: 'North Carolina', countryCode: 'US' }, localityLabel: 'Boone, North Carolina' });
  const metadata = await generateMetadata({ params: Promise.resolve({ id: report.id }) });
  expect(metadata.title).toBe('Creek cleanup, Boone – cleaned up | Litterbugs');
  expect(metadata.description).not.toContain('before-and-after');
  expect(metadata.openGraph).toMatchObject({ title: 'Creek cleanup, Boone – cleaned up', description: metadata.description });
  expect((metadata.description as string).length).toBeLessThanOrEqual(155);
  expect(metadata.alternates?.canonical).toBe(report.canonicalUrl);
});
it('marks unavailable report metadata noindex', async () => {
  loadReport.mockResolvedValue(null);
  expect((await generateMetadata({ params: Promise.resolve({ id: report.id }) })).robots).toEqual({ index: false, follow: false });
});

it('keeps an expired report readable without advertising current cleanup, funding or app actions', async () => {
  loadReport.mockResolvedValue({ ...report, state: 'expired', expiredDate: '2026-10-01T12:00:00Z', fundingEligible: true, rewardCents: 1000, community: { slug: 'us-nc-boone', path: '/communities/us/nc/boone', name: 'Boone' }, place: { locality: 'Boone', region: 'North Carolina', countryCode: 'US' } });
  render(await SharedReportPage({ params: Promise.resolve({ id: report.id }) }));
  expect(screen.getByText('Report expired')).toBeTruthy();
  expect(screen.getByText(/A cleanup has not been confirmed/)).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Find a current cleanup' }).getAttribute('href')).toBe('/reports');
  for (const name of ['Fund', 'Clean', 'Open in Litterbugs', 'View on map']) expect(screen.queryByRole('link', { name })).toBeNull();
  expect(screen.queryByText(/cleanup reward/)).toBeNull();
});

it('renders the actual evidence and history of a photo-less expired report in server HTML', async () => {
  loadReport.mockResolvedValue({ ...report, title: 'Basura en el patio', state: 'expired',
    rewardCents: 0, reportDate: '2026-09-16T14:38:27Z', expiredDate: '2026-10-16T14:38:27Z',
    litterTypes: ['Bottles', 'Cans', 'Paper products', 'Plastic bags'],
    notes: 'Scattered · Broken glass', severity: 'Medium' });
  const html = renderToStaticMarkup(await SharedReportPage({ params: Promise.resolve({ id: report.id }) }));
  expect(html).toContain('The report identified Bottles, Cans, Paper products, and Plastic bags.');
  expect(html).toContain('Recorded details: Scattered; Broken glass.');
  expect(html).toContain('The reported priority was medium.');
  expect(html).toContain('Its active reporting period ended on October 16, 2026.');
  expect(html).toContain('A cleanup has not been confirmed.');
  expect(html).toContain('Report expired');
  expect(html).not.toContain('This report is no longer active');
  expect(html).not.toContain('Cleanup result photo');
  expect((await generateMetadata({ params: Promise.resolve({ id: report.id }) })).alternates?.canonical).toBe(report.canonicalUrl);
});

it('keeps an older occurrence focused on its own Timeline and links the combined site history',async()=>{
 const old={...report,state:'completed' as const,reportDate:'2026-11-01',completionDate:'2026-11-10',reporterName:'Original reporter'};
 const newer={...report,id:'new-report',title:'New litter occurrence',reportDate:'2026-11-24',reporterName:'New reporter'};
 loadReport.mockResolvedValue(old);loadRelated.mockResolvedValue([]);
 loadSite.mockResolvedValue({id:'site-id',reports:[old,newer],currentReportId:newer.id,completedCount:1,canReportAgain:false});
 render(await SharedReportPage({params:Promise.resolve({id:old.id})}));
 expect(screen.getByRole('link',{name:'View site history'}).getAttribute('href')).toBe('/sites/site-id');
 expect(screen.getAllByRole('heading',{name:'Timeline'})).toHaveLength(1);
 expect(screen.queryByText('Reported by New reporter')).toBeNull();
 loadSite.mockResolvedValue(null);
});

it('thanks a finished cleanup with Tip buttons only for people who can be paid', async () => {
  const cleaner = '91000000-0000-4000-8000-000000000001';
  const reporter = '91000000-0000-4000-8000-000000000002';
  tipLinks.mockImplementation(async (ids: string[]) => Object.fromEntries(ids.filter(id => id === cleaner).map(id => [id, `/tip/${id}`])));
  loadReport.mockResolvedValue({ ...report, state: 'completed', community: { slug: 'us-nc-boone', path: '/communities/us/nc/boone', name: 'Boone' },
    cleanerName: 'Nevan', cleanerId: cleaner, reporterName: 'James B.', reporterId: reporter });
  render(await SharedReportPage({ params: Promise.resolve({ id: report.id }) }));
  expect(tipLinks).toHaveBeenCalledWith([cleaner, reporter]);
  // Only the cleaner can be paid, so one button goes straight to their tip page.
  const tip = screen.getByRole('link', { name: 'Leave a tip for Nevan' });
  expect(tip.getAttribute('href')).toBe(`/tip/${cleaner}?role=cleaner&back=%2Freports%2Freport-id&town=Boone`);
  expect(screen.queryByRole('button', { name: 'Leave a tip' })).toBeNull();
  tipLinks.mockResolvedValue({});
});

it('offers no tips before a cleanup is finished', async () => {
  tipLinks.mockClear();
  loadReport.mockResolvedValue({ ...report, cleanerId: '91000000-0000-4000-8000-000000000001', reporterId: '91000000-0000-4000-8000-000000000002' });
  render(await SharedReportPage({ params: Promise.resolve({ id: report.id }) }));
  expect(tipLinks).not.toHaveBeenCalled();
  expect(screen.queryByText('Leave a tip')).toBeNull();
});

it('asks who to tip when both the cleaner and the reporter can be paid', async () => {
  const cleaner = '91000000-0000-4000-8000-000000000001';
  const reporter = '91000000-0000-4000-8000-000000000002';
  tipLinks.mockImplementation(async (ids: string[]) => Object.fromEntries(ids.map(id => [id, `/tip/${id}`])));
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.setAttribute('open', ''); };
  loadReport.mockResolvedValue({ ...report, state: 'completed', cleanerName: 'Nevan', cleanerId: cleaner, reporterName: 'James B.', reporterId: reporter });
  render(await SharedReportPage({ params: Promise.resolve({ id: report.id }) }));
  fireEvent.click(screen.getByRole('button', { name: 'Leave a tip' }));
  expect(screen.getByRole('heading', { name: 'Who would you like to tip?' })).toBeTruthy();
  expect(screen.getByRole('link', { name: /Nevan.*Cleaned it up/ }).getAttribute('href')).toContain(`/tip/${cleaner}?role=cleaner`);
  expect(screen.getByRole('link', { name: /James B\..*Reported it/ }).getAttribute('href')).toContain(`/tip/${reporter}?role=reporter`);
  tipLinks.mockResolvedValue({});
});
