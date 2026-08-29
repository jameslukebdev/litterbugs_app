// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Report } from '@litterbugs/report-contract';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AccountDialog } from './account-dialog';

const { rpc, profileUpdate, reportQueryNumber } = vi.hoisted(() => ({
  rpc: vi.fn(async () => ({ data: null, error: null })),
  profileUpdate: vi.fn(),
  reportQueryNumber: { value: 0 },
}));

vi.mock('@/components/payout-setup-action', () => ({
  PayoutSetupAction: () => null,
}));

const expiredReport: Report = {
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

function query(result: { data: unknown; error: null }) {
  const builder = {
    eq: () => builder,
    gt: () => builder,
    in: () => builder,
    limit: () => Promise.resolve(result),
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
      getUser: vi.fn(async () => ({ data: { user: { id: 'member-id', email: 'member@example.com' } } })),
      resetPasswordForEmail: vi.fn(async () => ({ error: null })),
      signOut: vi.fn(async () => ({ error: null })),
    },
    functions: { invoke: vi.fn(async () => ({ data: null, error: null })) },
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
          updated_at: '2026-08-01T00:00:00.000Z',
        },
        error: null,
      });
      if (table === 'reports') {
        reportQueryNumber.value += 1;
        return query({ data: reportQueryNumber.value === 1 ? [] : [expiredReport], error: null });
      }
      if (table === 'cleanup_contributions') {
        return query({
          data: [{
            id: 'contribution-id',
            report_id: expiredReport.id,
            principal_amount_cents: 2500,
            platform_fee_cents: 250,
            total_amount_cents: 2750,
            status: 'succeeded',
            created_at: '2026-08-01T12:00:00.000Z',
          }],
          error: null,
        });
      }
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
  });

  it('renews an expired report for 30 days while preserving its displayed fund', async () => {
    render(<AccountDialog onClose={vi.fn()} onSignedOut={vi.fn()} onOpenReport={vi.fn()} />);

    expect(await screen.findByRole('heading', { name: 'Renew or close reports' })).toBeTruthy();
    expect(screen.getByText('$125.00 reward', { exact: false })).toBeTruthy();
    expect(screen.getByText('$2.50 fee · $27.50 total charged')).toBeTruthy();
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

    fireEvent.click(await screen.findByRole('button', { name: 'Close and refund' }));

    expect(window.confirm).toHaveBeenCalledWith(expect.stringMatching(/including the 10% fee/i));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('close_expired_report', {
      target_report_id: expiredReport.id,
    }));
    expect(await screen.findByText(/full contribution refunds have been queued/i)).toBeTruthy();
  });
});
