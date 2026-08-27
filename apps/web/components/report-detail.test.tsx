// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Report } from '@litterbugs/report-contract';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReportDetail } from './report-detail';

const createSignedUrl = vi.fn(async (path: string) => ({
  data: { signedUrl: `https://storage.example/${path}` },
  error: null,
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    storage: {
      from: () => ({ createSignedUrl }),
    },
  }),
}));

const report: Report = {
  cancelled_at: null,
  cleanup_state: 'available',
  created_at: '2026-08-21T12:00:00.000Z',
  expired_at: null,
  expires_at: '2026-09-20T12:00:00.000Z',
  funded_amount_cents: 0,
  funding_eligibility: 'pending',
  funding_frozen_at: null,
  funding_hold_reason: null,
  funding_locked_at: null,
  id: 'report-id',
  latitude: 35.99,
  litter_types: ['Bottles'],
  longitude: -78.9,
  notes_other: null,
  notes_presets: null,
  original_photo_reviewed_at: null,
  photo_paths: null,
  renewal_decision_due_at: null,
  renewal_status: 'active',
  severity: 'High',
  status: 'active',
  title: 'Photo report',
  types: null,
  user_id: 'user-id',
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ReportDetail photos', () => {
  it('uses the compatibility endpoint for an HEIC photo without changing Storage', async () => {
    render(
      <ReportDetail
        report={{ ...report, photo_paths: ['user/report/photo.heic'] }}
        isOwner={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const image = await screen.findByAltText('Report photo 1 of 1');
    expect(image.getAttribute('src')).toBe('/api/report-photo?path=user%2Freport%2Fphoto.heic');
    expect(createSignedUrl).not.toHaveBeenCalled();
  });

  it('signs only the currently selected browser-compatible photo', async () => {
    render(
      <ReportDetail
        report={{ ...report, photo_paths: ['user/report/one.jpg', 'user/report/two.png'] }}
        isOwner={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await waitFor(() => expect(createSignedUrl).toHaveBeenCalledTimes(1));
    expect(createSignedUrl).toHaveBeenLastCalledWith('user/report/one.jpg', 60 * 60);

    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));
    await waitFor(() => expect(createSignedUrl).toHaveBeenCalledTimes(2));
    expect(createSignedUrl).toHaveBeenLastCalledWith('user/report/two.png', 60 * 60);
  });

  it('does not offer ordinary edit or delete controls after funding locks a report', () => {
    render(
      <ReportDetail
        report={{ ...report, funding_locked_at: '2026-08-26T12:00:00.000Z' }}
        isOwner
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  });

  it('shows the cleaner-facing reward and cleanup status', () => {
    render(
      <ReportDetail
        report={{ ...report, funded_amount_cents: 12500, cleanup_state: 'claimed' }}
        isOwner={false}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('$125.00 reward')).toBeTruthy();
    expect(screen.getByText('Cleanup in progress')).toBeTruthy();
  });
});
