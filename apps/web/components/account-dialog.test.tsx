// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import type { Report } from '@litterbugs/report-contract';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountPage } from './account-page';
import { AccountDialog } from './account-dialog';

const { drafts, dashboard, blockDelete, blockedRows, rpc, profileUpdate, reportQueryNumber, invoke, clearDraft, signOut } = vi.hoisted(() => ({
  drafts: { ready: true, signal: undefined as undefined | ((ready: boolean) => void) },
  dashboard: { revision:0, failed:false, user:'member-id', paymentStatus:'succeeded', paymentCount:1 },
  invoke: vi.fn(),
  clearDraft: vi.fn(),
  signOut: vi.fn(),
  blockDelete: vi.fn(),
  blockedRows: { value: [] as unknown[] },
  rpc: vi.fn(async () => ({ data: null, error: null })),
  profileUpdate: vi.fn(),
  reportQueryNumber: { value: 0 },
}));

vi.mock('@/lib/use-data-refresh', () => ({ useDataRefresh: () => dashboard.revision, notifyDataChanged: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/components/resume-drafts', () => ({ ResumeDrafts: ({ onReady }: { onReady?: (ready: boolean) => void }) => {
  useEffect(() => { drafts.signal = onReady; if (drafts.ready) onReady?.(true); }, [onReady]);
  return <section aria-label="Resume your work">Saved draft summary</section>;
} }));
vi.mock('@/lib/saved-cleanup-draft', () => ({ clearAccountCleanupDrafts: vi.fn(async () => undefined) }));
vi.mock('@/lib/saved-report-draft', () => ({ clearPublishedReport: clearDraft, reportDraftLocation: vi.fn(async () => undefined) }));

vi.mock('@/components/payout-setup-action', () => ({
  PayoutSetupAction: () => null,
}));

const expiredReport: Report = {
  is_published: true,
  cancelled_at: null,
  cleanup_state: 'available',
  created_at: '2026-07-01T12:00:00.000Z',
  expired_at: '2026-08-01T12:00:00.000Z',
  expires_at: '2026-08-01T12:00:00.000Z',
  funded_amount_cents: 12500,
  funding_eligibility: 'eligible',
  funding_frozen_at: null,
  funding_hold_reason: null,
  funding_locked_at: '2026-07-02T12:00:00.000Z',
  id: 'expired-report-id',
  is_sample: false,
  latitude: 35.99,
  litter_types: ['Bottles'],
  longitude: -78.9,
  notes_other: null,
  notes_presets: null,
  original_photo_reviewed_at: '2026-07-01T12:05:00.000Z',
  photo_paths: ['member/report/photo.jpg'],
  renewal_decision_due_at: '2099-08-08T12:00:00.000Z',
  renewal_status: 'decision_required',
  severity: 'Medium',
  status: 'active',
  title: 'Creek cleanup',
  types: null,
  user_id: 'member-id',
};

function query(result: { data: unknown; error: unknown }) {
  const builder = {
    eq: () => builder,
    delete: () => { blockDelete(); return builder; },
    gt: () => builder,
    in: () => builder,
    limit: () => Promise.resolve(result),
    range: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    or: () => builder,
    order: () => builder,
    select: () => builder,
    single: () => Promise.resolve(result),
    update: (values: unknown) => { profileUpdate(values); return builder; },
  };
  return builder;
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getUser: vi.fn(async () => ({ data: { user: { id: dashboard.user, email: 'member@example.com' } } })),
      resetPasswordForEmail: vi.fn(async () => ({ error: null })),
      signOut,
    },
    functions: { invoke },
    from: (table: string) => {
      if (table === 'profiles') return query({
        data: {
          id: 'member-id',
          display_name: 'Member',
          username: 'member',
          bio: null,
          location: null,
          avatar_path: null,
          provider_avatar_url: null,
          profile_completed_at: '2026-08-01T00:00:00.000Z',
          reports_created_count: 7,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-08-01T00:00:00.000Z',
        },
        error: null,
      });
      if (dashboard.failed) return query({data:null,error:new Error('offline')});
      if (table === 'reports') {
        reportQueryNumber.value += 1;
        return query({ data: reportQueryNumber.value === 1 ? [] : [expiredReport], error: null });
      }
      if (table === 'cleanup_contributions') {
        return query({
          data: Array.from({ length: dashboard.paymentCount }, (_, index) => ({
            id: index === 0 ? 'contribution-id' : `contribution-${index}`,
            report_id: expiredReport.id,
            principal_amount_cents: 2500,
            platform_fee_cents: 250,
            total_amount_cents: 2750,
            status: dashboard.paymentStatus,
            report: { id: expiredReport.id, title: expiredReport.title, cleanup_state: expiredReport.cleanup_state },
            created_at: '2026-08-01T12:00:00.000Z',
          })),
          error: null,
        });
      }
      if (table === 'user_blocks') return query({ data: blockedRows.value, error: null });
      return query({ data: [], error: null });
    },
    rpc,
    storage: {
      from: () => ({
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        remove: vi.fn(async () => ({ error: null })),
        upload: vi.fn(async () => ({ error: null })),
      }),
    },
  }),
}));

beforeEach(() => {
  drafts.ready = true; drafts.signal = undefined;
  dashboard.revision=0;dashboard.failed=false;dashboard.user='member-id';dashboard.paymentStatus='succeeded';dashboard.paymentCount=1;
  invoke.mockReset().mockResolvedValue({ data: null, error: null });
  clearDraft.mockReset().mockResolvedValue(undefined);
  signOut.mockReset().mockResolvedValue({ error: null });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  vi.spyOn(window, 'alert').mockImplementation(() => {});
  blockDelete.mockClear();
  blockedRows.value = [];
  reportQueryNumber.value = 0;
  rpc.mockClear();
  profileUpdate.mockClear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('AccountDialog expired report decisions', () => {
  it('edits the same persistent member profile used by the mobile app', async () => {
    const onProfileChanged = vi.fn();
    render(<AccountDialog onClose={vi.fn()} onSignedOut={vi.fn()} onOpenReport={vi.fn()} onProfileChanged={onProfileChanged} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit profile' }));
    fireEvent.change(screen.getByRole('textbox', { name: /^Display name/ }), { target: { value: 'Sam Cleaner' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Location/ }), { target: { value: 'Asheville, NC' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() => expect(profileUpdate).toHaveBeenCalledWith(expect.objectContaining({
      display_name: 'Sam Cleaner',
      location: 'Asheville, NC',
    })));
    expect(onProfileChanged).toHaveBeenCalled();
    expect(await screen.findByText(/website and app account are now up to date/i)).toBeTruthy();
    expect(screen.queryByText('7')).toBeNull();
    expect(screen.getByLabelText('Reports submitted').textContent).toContain('0');
    expect(screen.getByText('Reports')).toBeTruthy();
  });

  it('loads and unblocks the same blocked accounts used by the mobile app', async () => {
    blockedRows.value = [{
      blocked_id: 'blocked-member-id',
      blocked: {
        id: 'blocked-member-id',
        display_name: 'Blocked Member',
        username: 'blocked.member',
        provider_avatar_url: null,
        avatar_path: null,
        updated_at: '2026-08-01T00:00:00.000Z',
      },
    }];
    const onAccountDataChanged = vi.fn();
    render(<AccountDialog onClose={vi.fn()} onSignedOut={vi.fn()} onOpenReport={vi.fn()} onAccountDataChanged={onAccountDataChanged} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Settings' }));
    expect(await screen.findByText('Blocked Member')).toBeTruthy();
    fireEvent.click(screen.getByText('Blocked accounts'));
    expect(screen.getByText('@blocked.member')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Unblock' }));

    await waitFor(() => expect(blockDelete).toHaveBeenCalledTimes(1));
    expect(onAccountDataChanged).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/public reports are visible again/i)).toBeTruthy();
    expect(screen.queryByText('Blocked Member')).toBeNull();
  });

  it('renews an expired report for 30 days while preserving its displayed fund', async () => {
    render(<AccountDialog onClose={vi.fn()} onSignedOut={vi.fn()} onOpenReport={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Payments' }));
    expect(screen.getByText('$2.50 fee · $27.50 total')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back to profile' }));
    fireEvent.click(screen.getByRole('button', { name: 'My activity' }));
    fireEvent.click(screen.getByRole('button', { name: 'My reports' }));
    expect(await screen.findByRole('heading', { name: 'Renew or close reports' })).toBeTruthy();
    expect(screen.getByText('$125.00 reward', { exact: false })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Renew 30 days' }));

    await waitFor(() => expect(rpc).toHaveBeenCalledWith('renew_report', {
      target_report_id: expiredReport.id,
    }));
    expect(await screen.findByText(/renewed for 30 days/i)).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Renew or close reports' })).toBeNull();
  });

  it('requires confirmation before closing and queuing full refunds', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<AccountDialog onClose={vi.fn()} onSignedOut={vi.fn()} onOpenReport={vi.fn()} />);

    fireEvent.click(await screen.findByRole('button', { name: 'My activity' }));
    fireEvent.click(screen.getByRole('button', { name: 'My reports' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Close and refund' }));

    expect(window.confirm).toHaveBeenCalledWith(expect.stringMatching(/including the service fee/i));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('close_expired_report', {
      target_report_id: expiredReport.id,
    }));
    expect(await screen.findByText(/full contribution refunds have been queued/i)).toBeTruthy();
  });
});


describe('saved report cleanup after account deletion', () => {
  async function account() {
    const onSignedOut = vi.fn();
    render(<AccountDialog onClose={vi.fn()} onSignedOut={onSignedOut} onOpenReport={vi.fn()} />);
    await screen.findByText('Member');
    fireEvent.click(await screen.findByRole('button', { name: 'Settings' }));
    return onSignedOut;
  }
  it('clears only the deleted account’s draft and journal after confirmed deletion', async () => {
    invoke.mockResolvedValue({ data: { deleted: true }, error: null });
    const onSignedOut = await account();
    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
    await waitFor(() => expect(onSignedOut).toHaveBeenCalled());
    expect(clearDraft).toHaveBeenCalledExactlyOnceWith('member-id');
    expect(clearDraft.mock.invocationCallOrder[0]).toBeGreaterThan(invoke.mock.invocationCallOrder[0]);
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
  it('preserves local photos when account deletion fails', async () => {
    invoke.mockResolvedValue({ data: null, error: new Error('Network failure') });
    const onSignedOut = await account();
    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
    await screen.findByText(/Couldn’t delete account/);
    expect(clearDraft).not.toHaveBeenCalled();expect(onSignedOut).not.toHaveBeenCalled();
  });
  it('reports failed local cleanup without claiming the deleted account still exists', async () => {
    invoke.mockResolvedValue({ data: { deleted: true }, error: null });
    clearDraft.mockRejectedValue(new Error('Browser storage unavailable'));
    const onSignedOut = await account();
    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }));
    await waitFor(() => expect(onSignedOut).toHaveBeenCalled());
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Your account was deleted'));
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
  it('retains drafts on ordinary sign-out', async () => {
    const onSignedOut = await account();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(onSignedOut).toHaveBeenCalled());
    expect(clearDraft).not.toHaveBeenCalled();expect(invoke).not.toHaveBeenCalled();
  });
});


it('uses authenticated history links in the real account wrapper with one selected navigation section', async () => {
  reportQueryNumber.value = 1;
  render(<AccountPage destination="reports" userId="member-id" />);
  const reportLink = await screen.findByRole('link', { name: /Creek cleanup.*Closed/ });
  expect(reportLink.getAttribute('href')).toBe('/account/reports/expired-report-id?from=reports');
  expect(screen.getByRole('link', { name: 'My activity' }).getAttribute('aria-current')).toBe('page');
  expect(screen.getByRole('link', { name: 'My reports' }).getAttribute('aria-current')).toBe('page');
  expect(screen.getByRole('link', { name: 'Cleanup history' }).getAttribute('href')).toBe('/account/activity?view=history');
  expect(screen.getByRole('heading', { level: 1, name: 'My activity' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Back to profile' })).toBeNull();
});
it('restores cleanup history from its route state and uses route-based payment receipts', async () => {
  const { unmount } = render(<AccountPage destination="activity" activityView="history" userId="member-id" />);
  expect(await screen.findByRole('heading', { name: 'Completed cleanups' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Cleanup history' }).getAttribute('aria-current')).toBe('page');
  unmount(); render(<AccountPage destination="payments" userId="member-id" />);
  const receipt = await screen.findByRole('link', { name: /Creek cleanup.*25.00 contribution/ });
  expect(receipt.getAttribute('href')).toBe('/account/payments/contribution-id');
});


it('retains account work after a failed refresh, offers retry, and never declares unknown tasks empty', async () => {
  reportQueryNumber.value=1;
  const props={embedded:true,initialSection:'activity' as const,initialActivityTab:'reports' as const,onClose:vi.fn(),onSignedOut:vi.fn(),onOpenReport:vi.fn()};
  const view=render(<AccountDialog {...props} />);
  await screen.findByRole('link',{name:/Creek cleanup.*Closed/});
  dashboard.failed=true;dashboard.revision++;
  view.rerender(<AccountDialog {...props} />);
  await screen.findByText('Reports could not be refreshed.');
  expect(screen.getByRole('link',{name:/Creek cleanup.*Closed/})).toBeTruthy();
  expect(screen.queryByText(/No actions are due/)).toBeNull();
  dashboard.failed=false;
  fireEvent.click(screen.getByRole('button',{name:'Retry reports'}));
  await waitFor(()=>expect(screen.queryByText('Reports could not be refreshed.')).toBeNull());
  expect(screen.getByRole('link',{name:/Creek cleanup.*Closed/})).toBeTruthy();
  dashboard.user='another-account';dashboard.failed=true;dashboard.revision++;
  view.rerender(<AccountDialog {...props} />);
  await screen.findByText('Reports could not be refreshed.');
  expect(screen.queryByRole('link',{name:/Creek cleanup.*Closed/})).toBeNull();
});
it('focuses the requested renewal after its authorized data loads', async () => {
 const scroll=vi.fn();
 const original=HTMLElement.prototype.scrollIntoView;
 HTMLElement.prototype.scrollIntoView=scroll;
 try {
   render(<AccountDialog embedded initialSection="activity" initialActivityTab="reports" initialRenewalId="expired-report-id" onClose={vi.fn()} onSignedOut={vi.fn()} onOpenReport={vi.fn()}/>);
   await waitFor(()=>expect(document.activeElement?.id).toBe('renewal-expired-report-id'));
   expect(scroll).toHaveBeenCalledWith({block:'center'});
   expect(screen.getByRole('button',{name:'Renew 30 days'})).toBeTruthy();
 } finally { HTMLElement.prototype.scrollIntoView=original; }
});

it('keeps activity navigation before saved work in document and keyboard order', async () => {
  render(<AccountPage destination="activity" userId="member-id" />);
  await screen.findByRole('heading', { name: 'Current cleanups' });
  const navigation = screen.getByRole('navigation', { name: 'My activity' });
  const drafts = screen.getByRole('region', { name: 'Resume your work' });
  expect(navigation.compareDocumentPosition(drafts) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
it('identifies unconfirmed contributions separately from cleanup earnings', async () => {
  dashboard.paymentStatus = 'payment_pending';
  render(<AccountPage destination="payments" userId="member-id" />);
  const receipt = await screen.findByRole('link', { name: /Creek cleanup.*Report expired-.*25.00 contribution.*Payment unconfirmed/ });
  expect(receipt.getAttribute('href')).toBe('/account/payments/contribution-id');
  expect(screen.queryByText(/^Processing/)).toBeNull();
  const contributions = screen.getByRole('heading', { name: 'Your contributions' });
  const earnings = screen.getByRole('heading', { name: 'Cleanup earnings' });
  expect(contributions.compareDocumentPosition(earnings) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

it('reveals older contributions without a nested scrolling list', async () => {
  dashboard.paymentCount = 7;
  render(<AccountPage destination="payments" userId="member-id" />);
  await screen.findByRole('button', { name: 'Show 2 more contributions' });
  expect(screen.getAllByRole('link', { name: /Creek cleanup.*contribution/ })).toHaveLength(5);
  fireEvent.click(screen.getByRole('button', { name: 'Show 2 more contributions' }));
  expect(screen.getAllByRole('link', { name: /Creek cleanup.*contribution/ })).toHaveLength(7);
  expect(screen.queryByRole('button', { name: /more contributions/ })).toBeNull();
});

it('uses a singular label when only one older contribution remains', async () => {
  dashboard.paymentCount = 6;
  render(<AccountPage destination="payments" userId="member-id" />);
  await screen.findByRole('button', { name: 'Show 1 more contribution' });
});


describe('quiet profile loading', () => {
  it('reserves the profile without temporary identity or loading copy and keeps drafts in activity', async () => {
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    render(<AccountPage destination="" userId="member-id" />);
    expect(screen.getByRole('status', { name: 'Loading profile' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Edit profile' })).toBeNull();
    expect(screen.queryByText('Loading your activity…')).toBeNull();
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(await screen.findByRole('heading', { name: 'Member' })).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Resume your work' })).toBeNull();
    expect(screen.queryByText(/No actions are due/)).toBeNull();
    expect(screen.getByRole('navigation', { name: 'Profile sections' })).toBeTruthy();
  });
});


it('does not render settings or missing-email copy beneath a temporary loading block', async () => {
  render(<AccountPage destination="settings" userId="member-id" />);
  expect(screen.getByRole('status', { name: 'Loading account section' })).toBeTruthy();
  expect(screen.queryByText('Email unavailable for this account')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Delete account' })).toBeNull();
  expect(await screen.findByRole('heading', { name: 'Account settings' })).toBeTruthy();
  expect(screen.queryByRole('status', { name: 'Loading account section' })).toBeNull();
});
it('reveals activity and saved work together while keeping the tabs available', async () => {
  drafts.ready = false;
  render(<AccountPage destination="activity" userId="member-id" />);
  await waitFor(() => expect(drafts.signal).toBeTypeOf('function'));
  expect(screen.getByRole('navigation', { name: 'My activity' })).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Current cleanups' })).toBeNull();
  expect(screen.queryByRole('region', { name: 'Resume your work' })).toBeNull();
  act(() => drafts.signal?.(true));
  expect(screen.getByRole('heading', { name: 'Current cleanups' })).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Resume your work' })).toBeTruthy();
  expect(screen.queryByRole('status', { name: 'Loading account section' })).toBeNull();
});
