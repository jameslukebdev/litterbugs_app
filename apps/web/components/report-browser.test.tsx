// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { MappableReport } from '@litterbugs/report-contract';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReportBrowser } from './report-browser';

const report: MappableReport = {
  cancelled_at: null,
  cleanup_state: 'available',
  created_at: '2026-08-26T12:00:00.000Z',
  expired_at: null,
  expires_at: '2026-09-25T12:00:00.000Z',
  funded_amount_cents: 12500,
  funding_eligibility: 'eligible',
  funding_frozen_at: null,
  funding_hold_reason: null,
  funding_locked_at: null,
  id: 'report-id',
  latitude: 36.21,
  litter_types: ['Bottles'],
  longitude: -81.67,
  notes_other: null,
  notes_presets: null,
  original_photo_reviewed_at: null,
  photo_paths: null,
  renewal_decision_due_at: null,
  renewal_status: 'active',
  severity: 'High',
  status: 'active',
  title: 'Roadside bottles',
  types: null,
  user_id: 'user-id',
};

afterEach(cleanup);

describe('ReportBrowser', () => {
  it('makes live reports and the cleaner reward discoverable', () => {
    const onSelect = vi.fn();
    render(<ReportBrowser reports={[report]} open onToggle={vi.fn()} onSelect={onSelect} />);

    expect(screen.getByText('Map')).toBeTruthy();
    expect(screen.getByRole('heading', { name: '1 cleanup opportunity' })).toBeTruthy();
    expect(screen.getByText('Roadside bottles')).toBeTruthy();
    expect(screen.getByText('$125 reward')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /roadside bottles/i }));
    expect(onSelect).toHaveBeenCalledWith(report);
  });
});
