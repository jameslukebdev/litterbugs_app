// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PublicReportShareModel } from '@/lib/public-report-share-model';
import { notifyDataChanged } from '@/lib/use-data-refresh';
import { reportSite } from '@/lib/report-site-model';
import { ReportSiteActivity } from './report-site-activity';

const mocks = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn(), submit: vi.fn(), user: { id: 'member', is_anonymous: false } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }) }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { getUser: async () => ({ data: { user: mocks.user } }) } }) }));
vi.mock('@/lib/saved-report-draft', () => ({ loadSiteReportPublication: async () => undefined }));
vi.mock('@/lib/submit-site-report', () => ({ submitSiteReport: (...args: unknown[]) => mocks.submit(...args) }));
vi.mock('./report-wizard', () => ({ ReportWizard: ({ initialDraft, onSubmit }: { initialDraft: { title: string }; onSubmit: (draft: unknown) => Promise<unknown> }) => <div role="dialog" aria-label="Report litter"><span>{initialDraft.title}</span><button onClick={() => void onSubmit(initialDraft)}>Submit new occurrence</button></div> }));
const old: PublicReportShareModel = { id: 'old', state: 'completed', title: 'Greenway Trail', generalLocation: 'Boone', location: { latitude: 36.2, longitude: -81.6 }, reportDate: '2026-11-15T12:00:00Z', reporterName: 'Riley', severity: 'Medium', litterTypes: ['Bottles'], notes: null, cleanerName: 'Morgan', completionDate: '2026-11-17T12:00:00Z', claimedDate: '2026-11-16T12:00:00Z', bagsOrItemsRemoved: 4, weightPounds: 27, cleanupMinutes: 60, cleanupDescription: 'Cleared the trail.', beforePhotoUrl: '/before.jpg', afterPhotoUrl: '/after.jpg', canonicalUrl: '/reports/old' };
afterEach(() => { cleanup(); vi.clearAllMocks(); window.history.replaceState({}, '', '/'); });
describe('site activity', () => {
  it('keeps one Timeline and expands the cleanup evidence under the old reporter', () => {
    const current = { ...old, id: 'new', state: 'available' as const, reporterName: 'Jamie', reportDate: '2026-11-24T12:00:00Z', completionDate: null, claimedDate: null, cleanerName: null };
    render(<ReportSiteActivity reportId="new" initialSite={reportSite([old, current])} />);
    expect(screen.getAllByRole('heading', { name: 'Timeline' })).toHaveLength(1);
    expect(screen.getAllByText('Reported by Riley').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText('Reported by Riley', { selector: 'small' }));
    expect(screen.getAllByText('Reported by Jamie').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Needs cleaning again' })).toBeNull();
    fireEvent.click(screen.getByText('Cleaned up by Morgan'));
    expect(screen.getByAltText('After cleanup on November 17, 2026')).toBeTruthy();
  });
  it('uses the existing report wizard and opens the server-selected current report after a race', async () => {
    mocks.submit.mockResolvedValue({ reportId: 'existing', alreadyReported: true });
    render(<ReportSiteActivity reportId="old" initialSite={reportSite([old], true)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Needs cleaning again' }));
    const dialog = await screen.findByRole('dialog', { name: 'Report litter' });
    expect(within(dialog).getByText('Greenway Trail')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Submit new occurrence' }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/sites/old?alreadyReported=1'));
    expect(mocks.submit.mock.calls[0][0]).toBe('old');
  });
  it('dismisses the already-reported notice without a second reporting step', () => {
    window.history.replaceState({}, '', '/reports/current?alreadyReported=1');
    render(<ReportSiteActivity reportId="old" initialSite={reportSite([old], true)} />);
    expect(screen.getByRole('status').textContent).toContain('already been reported');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notice' }));
    expect(screen.queryByRole('status')).toBeNull();
    expect(window.location.search).toBe('');
  });  it('refreshes actions and history together after cleanup approval with one public read', async () => {
    const pending = { ...old, state: 'in_progress' as const, completionDate: null, cleanerName: null };
    const fetch = vi.fn(async () => ({ ok: true, json: async () => reportSite([old]) }));
    vi.stubGlobal('fetch', fetch);
    try {
      render(<><ReportSiteActivity reportId="old" initialSite={reportSite([pending])} mode="actions" /><ReportSiteActivity reportId="old" initialSite={reportSite([pending])} mode="timeline" /></>);
      expect(screen.queryByRole('button', { name: 'Needs cleaning again' })).toBeNull();
      await act(async () => notifyDataChanged());
      await screen.findByRole('button', { name: 'Needs cleaning again' });
      expect(screen.getByText('1 cleanup')).toBeTruthy();
      expect(screen.getAllByRole('heading', { name: 'Timeline' })).toHaveLength(1);
      expect(fetch).toHaveBeenCalledTimes(1);
    } finally { vi.unstubAllGlobals(); }
  });

});
