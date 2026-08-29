// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { MappableReport } from '@litterbugs/report-contract';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReportBrowser } from './report-browser';

const report: MappableReport = {
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
    expect(screen.getByText('Ends Sep 25')).toBeTruthy();
    expect(screen.getByText('No photo yet')).toBeTruthy();
    expect(screen.getByText('Open')).toBeTruthy();
    expect(screen.getByText('Bottles')).toBeTruthy();
    expect(screen.getByText('High priority')).toBeTruthy();
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

    expect(screen.getByRole('heading', { name: '2 cleanup opportunities' })).toBeTruthy();
    expect(screen.queryByText('Claimed cleanup')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Rewarded' }));
    expect(screen.getByRole('heading', { name: '1 cleanup opportunity' })).toBeTruthy();
    expect(screen.getByText('$125 reward')).toBeTruthy();
    expect(screen.queryByText('Volunteer park cleanup')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'In progress' }));
    expect(screen.getByText('Claimed cleanup')).toBeTruthy();
    expect(screen.getByText('$35 reward')).toBeTruthy();
    expect(screen.getAllByText('In progress')).toHaveLength(2);
    expect(onVisibleReportsChange).toHaveBeenCalled();
  });
});
