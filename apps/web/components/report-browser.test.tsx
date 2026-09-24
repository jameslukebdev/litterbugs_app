// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { MappableReport } from '@litterbugs/report-contract';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReportBrowser } from './report-browser';

const report: MappableReport = {
  is_published: true,
  cancelled_at: null,
  cleanup_state: 'available',
  created_at: '2026-08-26T00:15:00.000Z',
  expired_at: null,
  expires_at: '2026-09-25T12:00:00.000Z',
  funded_amount_cents: 12500,
  funding_eligibility: 'eligible',
  funding_frozen_at: null,
  funding_hold_reason: null,
  funding_locked_at: null,
  id: 'report-id',
  is_sample: false,
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
    expect(screen.getByText(/1 litter report · Map area/)).toBeTruthy();
    expect(screen.getByText('Roadside bottles')).toBeTruthy();
    expect(screen.getByText('$125 reward')).toBeTruthy();
    expect(screen.getByText(/(?:day|hr|min).*ago|Just now/)).toBeTruthy();
    expect(screen.getByText('No photo yet')).toBeTruthy();
    expect(screen.getAllByText('Available')[1]).toBeTruthy();
    expect(screen.getByText('Bottles')).toBeTruthy();
    expect(screen.getAllByText('High')[0]).toBeTruthy();
    expect(document.querySelector('.report-result-photo')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /roadside bottles/i }));
    expect(onSelect).toHaveBeenCalledWith(report);
  });

  it('uses a title-first dense summary and synchronizes preview state', () => {
    const onPreviewReport = vi.fn();
    render(
      <ReportBrowser
        reports={[{ ...report, litter_types: ['Bottles', 'Cans'], notes_presets: ['Broken glass'] }]}
        open
        onToggle={vi.fn()}
        onSelect={vi.fn()}
        onPreviewReport={onPreviewReport}
        previewedReportId={report.id}
      />,
    );

    const card = screen.getByRole('button', { name: /roadside bottles/i });
    const title = screen.getByText('Roadside bottles');
    const reward = screen.getByText('$125 reward');

    expect(title.compareDocumentPosition(reward) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Bottles · Cans · Broken glass')).toBeTruthy();
    expect(card.classList.contains('report-result-previewed')).toBe(true);

    fireEvent.pointerEnter(card);
    fireEvent.pointerLeave(card);
    fireEvent.focus(card);
    fireEvent.blur(card);
    expect(onPreviewReport).toHaveBeenNthCalledWith(1, report.id);
    expect(onPreviewReport).toHaveBeenNthCalledWith(2, null);
    expect(onPreviewReport).toHaveBeenNthCalledWith(3, report.id);
    expect(onPreviewReport).toHaveBeenNthCalledWith(4, null);
  });

  it('uses a cached, right-sized image for a photographed report card', () => {
    render(<ReportBrowser reports={[{ ...report, photo_paths: ['user/report/photo.jpg'] }]} open onToggle={vi.fn()} onSelect={vi.fn()} />);

    const image = document.querySelector('.report-result-photo img');
    expect(image?.getAttribute('src')).toBe('/api/report-photo?path=user%2Freport%2Fphoto.jpg&variant=card');
    expect(image?.getAttribute('fetchpriority')).toBe('high');
  });

  it('preloads the optimized detail image when a photographed card is explored', () => {
    const originalImage = globalThis.Image;
    const sources: string[] = [];
    class MockImage {
      decoding = '';
      set src(value: string) { sources.push(value); }
    }
    globalThis.Image = MockImage as unknown as typeof Image;

    render(<ReportBrowser reports={[{ ...report, photo_paths: ['user/report/preload.jpg'] }]} open onToggle={vi.fn()} onSelect={vi.fn()} />);
    fireEvent.pointerEnter(screen.getByRole('button', { name: /roadside bottles/i }));

    expect(sources).toContain('/api/report-photo?path=user%2Freport%2Fpreload.jpg&variant=detail');
    globalThis.Image = originalImage;
  });

  it('makes favorite and hidden preferences discoverable and reversible', () => {
    const hiddenReport = { ...report, id: 'hidden-report', title: 'Hidden trail report' };
    render(
      <ReportBrowser
        reports={[report, hiddenReport]}
        open
        onToggle={vi.fn()}
        onSelect={vi.fn()}
        favoriteReportIds={new Set([report.id])}
        hiddenReportIds={new Set([hiddenReport.id])}
      />,
    );

    expect(screen.queryByText('Hidden trail report')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Favorites (1)' }));
    expect(screen.getByText('Roadside bottles')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Hidden (1)' }));
    expect(screen.getByText('Hidden trail report')).toBeTruthy();
    expect(screen.queryByText('Roadside bottles')).toBeNull();
  });

  it('filters and sorts reports while keeping workflow state separate from reward', () => {
    const volunteer = {
      ...report,
      id: 'volunteer-report',
      funded_amount_cents: 0,
      severity: 'Low',
      title: 'Volunteer park cleanup',
    };
    const claimed = {
      ...report,
      id: 'claimed-report',
      cleanup_state: 'claimed',
      funded_amount_cents: 3500,
      title: 'Claimed cleanup',
    };
    const onVisibleReportsChange = vi.fn();

    render(
      <ReportBrowser
        reports={[volunteer, claimed, report]}
        open
        onToggle={vi.fn()}
        onSelect={vi.fn()}
        onVisibleReportsChange={onVisibleReportsChange}
      />,
    );

    expect(screen.getByText(/3 litter reports · Map area/)).toBeTruthy();
    expect(screen.getByText('Claimed cleanup')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Rewarded' }));
    expect(screen.getByText(/1 cleanup opportunity · Map area/)).toBeTruthy();
    expect(screen.getByText('$125 reward')).toBeTruthy();
    expect(screen.queryByText('Volunteer park cleanup')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'In progress' }));
    expect(screen.getByText('Claimed cleanup')).toBeTruthy();
    expect(screen.getByText('$35 reward')).toBeTruthy();
    expect(document.querySelector('.report-result-workflow')?.textContent).toBe('In progress');
    expect(onVisibleReportsChange).toHaveBeenCalled();
  });
});


it('shows completed cleanups without presenting their old expiration as an upcoming deadline', () => {
  render(<ReportBrowser reports={[{ ...report, cleanup_state: 'completed', expires_at: '2020-01-01T00:00:00Z' }]} open onToggle={vi.fn()} onSelect={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Completed' }));
  expect(screen.getByText(/1 completed cleanup · Map area/)).toBeTruthy();
  expect(screen.getByText('Cleanup complete')).toBeTruthy();
  expect(screen.getByText('$125 funded cleanup')).toBeTruthy();
  expect(screen.queryByText(/Ends /)).toBeNull();
});
it('includes photos-under-review and changes-requested cleanups in progress', () => {
  render(<ReportBrowser reports={[{ ...report, cleanup_state: 'completion_submitted' }, { ...report, id: 'changes', title: 'Changes cleanup', cleanup_state: 'changes_requested' }]} open onToggle={vi.fn()} onSelect={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'In progress' }));
  expect(screen.getByText(/2 cleanups in progress · Map area/)).toBeTruthy();
  expect(screen.getByText('Changes cleanup')).toBeTruthy();
});

it('combines status, reward, severity, text, and radius independently', () => {
  const onDiscoveryFiltersChange = vi.fn();
  render(<ReportBrowser reports={[
    report,
    { ...report, id: 'low', title: 'Low bottles', severity: 'Low' },
    { ...report, id: 'unfunded', title: 'Unfunded bottles', funded_amount_cents: 0 },
    { ...report, id: 'far', title: 'Far bottles', latitude: 40 },
    { ...report, id: 'other', title: 'Cans' },
  ]} mapCenter={{ latitude: 36.21, longitude: -81.67 }} open onToggle={vi.fn()} onSelect={vi.fn()} onDiscoveryFiltersChange={onDiscoveryFiltersChange} />);
  fireEvent.change(screen.getByLabelText('Cleanup status'), { target: { value: 'available' } });
  fireEvent.change(screen.getByLabelText('Reward'), { target: { value: 'funded' } });
  fireEvent.change(screen.getByLabelText('Severity'), { target: { value: 'high' } });
  fireEvent.change(screen.getByLabelText('Distance from map center'), { target: { value: '5' } });
  fireEvent.change(screen.getByLabelText('Search report titles and notes'), { target: { value: 'bottles' } });
  fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
  expect(screen.getByText(/1 litter report · Map area/)).toBeTruthy();
  expect(onDiscoveryFiltersChange).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'available', funding: 'funded', severity: 'high', radius: 5, query: 'bottles' }));
  expect(screen.queryByText('Far bottles')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
  fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
  expect(screen.getByText(/5 litter reports · Map area/)).toBeTruthy();
});
