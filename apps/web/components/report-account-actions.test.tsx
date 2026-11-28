// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import Link from 'next/link';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportAccountActions } from './report-account-actions';

const state = vi.hoisted(() => ({
  user: null as { id: string; is_anonymous?: boolean } | null,
  report: {} as Record<string, unknown>, attempt: null as { status: string } | null,
  failed: false, listener: null as null | ((_event: string, session: { user: { id: string } } | null) => void),
  reads: vi.fn(),
}));
vi.mock('@/lib/use-data-refresh', () => ({ useDataRefresh: () => 0 }));
vi.mock('@/lib/cleanup-issues', () => ({ cleanupIssuesEnabled: true }));
vi.mock('@/components/cleanup-issue-tools', () => ({ ReportIssueAccess: () => <Link href="/account/cleanup-issues/private-id">Private conversation</Link> }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({
  auth: {
    getUser: async () => ({ data: { user: state.user } }),
    onAuthStateChange: (listener: typeof state.listener) => { state.listener = listener; return { data: { subscription: { unsubscribe: vi.fn() } } }; },
  },
  from: (table: string) => {
    const query = {
      select: () => query, eq: () => query, is: () => query, order: () => query, limit: () => query,
      maybeSingle: async () => { state.reads(table); return { data: table === 'reports' ? state.report : state.attempt, error: state.failed ? new Error('offline') : null }; },
    }; return query;
  },
}) }));
const id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const fallback = <a href="/map">Public actions</a>;
const open = () => render(<ReportAccountActions reportId={id}>{fallback}</ReportAccountActions>);
beforeEach(() => {
  state.user = null; state.attempt = null; state.failed = false; state.reads.mockClear();
  state.report = { user_id: 'reporter', cleanup_state: 'claimed', cancelled_at: null, expired_at: null, moderated_at: null, expires_at: '2099-01-01' };
});
afterEach(cleanup);
describe('account actions on the existing public report', () => {
  it('server-renders only public actions without account reads or private content', () => {
    state.user = { id: 'reporter' };
    const html = renderToStaticMarkup(<ReportAccountActions reportId={id}>{fallback}</ReportAccountActions>);
    expect(html).toContain('Public actions'); expect(html).not.toContain('Private conversation'); expect(html).not.toContain('Edit report');
    expect(state.reads).not.toHaveBeenCalled();
  });
  it('keeps anonymous accounts on public actions without reading participation', async () => {
    state.user = { id: 'anonymous', is_anonymous: true }; open(); await act(async () => {});
    expect(screen.getByRole('link', { name: 'Public actions' })).toBeTruthy(); expect(state.reads).not.toHaveBeenCalled();
  });
  it('gives the reporter Edit and a link to the separate conversation', async () => {
    state.user = { id: 'reporter' }; open();
    expect((await screen.findByRole('link', { name: 'Edit report' })).getAttribute('href')).toBe(`/account/reports/${id}/edit`);
    expect(screen.getByRole('link', { name: 'Private conversation' }).getAttribute('href')).toContain('/account/cleanup-issues/');
    expect(screen.queryByRole('link', { name: 'Continue cleanup' })).toBeNull();
  });
  it('retains public funding and cleaning actions for an available report owner', async () => {
    state.user = { id: 'reporter' }; state.report.cleanup_state = 'available'; open();
    await screen.findByRole('link', { name: 'Edit report' }); expect(screen.getByRole('link', { name: 'Public actions' })).toBeTruthy();
  });
  it('takes the assigned cleaner to the existing cleanup form', async () => {
    state.user = { id: 'cleaner' }; state.attempt = { status: 'claimed' }; open();
    expect((await screen.findByRole('link', { name: 'Continue cleanup' })).getAttribute('href')).toBe(`/account/reports/${id}?task=cleanup`);
    expect(screen.queryByRole('link', { name: 'Edit report' })).toBeNull(); expect(screen.queryByRole('link', { name: 'Public actions' })).toBeNull();
  });
  it('gives the reporter review access after evidence is submitted', async () => {
    state.user = { id: 'reporter' }; state.report.cleanup_state = 'completion_submitted'; open();
    expect((await screen.findByRole('link', { name: 'Review cleanup' })).getAttribute('href')).toBe(`/account/reports/${id}?task=review`);
    expect(screen.queryByRole('link', { name: 'Edit report' })).toBeNull();
  });
  it('shows a submitted cleaner review status without another submission action', async () => {
    state.user = { id: 'cleaner' }; state.attempt = { status: 'completion_submitted' }; state.report.cleanup_state = 'completion_submitted'; open();
    await screen.findByText('Cleanup under review'); expect(screen.queryByRole('link', { name: 'Continue cleanup' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Review cleanup' })).toBeNull();
  });
  it('keeps outsiders on public actions without a private conversation shortcut', async () => {
    state.user = { id: 'outsider' }; open(); await waitFor(() => expect(state.reads).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('link', { name: 'Public actions' })).toBeTruthy(); expect(screen.queryByRole('link', { name: 'Private conversation' })).toBeNull();
  });
  it('removes private actions immediately on sign-out', async () => {
    state.user = { id: 'reporter' }; open(); await screen.findByRole('link', { name: 'Edit report' });
    act(() => state.listener?.('SIGNED_OUT', null));
    expect(screen.queryByRole('link', { name: 'Private conversation' })).toBeNull(); expect(screen.queryByRole('link', { name: 'Edit report' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Public actions' })).toBeTruthy();
  });
  it('allows retrying an account read failure while retaining public content', async () => {
    state.user = { id: 'reporter' }; state.failed = true; open(); await screen.findByRole('button', { name: 'Try again' });
    expect(screen.getByRole('link', { name: 'Public actions' })).toBeTruthy(); state.failed = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' })); await screen.findByRole('link', { name: 'Edit report' });
  });
  it.each([{ cancelled_at: '2026-11-25' }, { expired_at: '2026-11-25' }, { cleanup_state: 'completed' }])('does not offer active tasks for closed/completed records: %j', async change => {
    state.user = { id: 'reporter' }; Object.assign(state.report, change); open(); await screen.findByRole('link', { name: 'Private conversation' });
    expect(screen.queryByRole('link', { name: 'Edit report' })).toBeNull(); expect(screen.queryByRole('link', { name: 'Continue cleanup' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Review cleanup' })).toBeNull();
  });
});
