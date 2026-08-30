import { describe, expect, it, vi } from 'vitest';

import {
  createNativeReportShareContent,
  createReportShareModel,
  formatReportShareMessage,
  isReportShareable,
  reportShareActionLabel,
  shareReportWithSystemSheet,
} from './reportSharing';

const now = new Date('2026-08-28T12:00:00.000Z');
const availableReport = {
  id: 'report-1',
  cleanup_state: 'available',
  title: 'Litter beside the trail',
  latitude: 35.60091,
  longitude: -82.55404,
  severity: 'Medium',
  notes_presets: ['Near a creek'],
  notes_other: 'Plastic bottles and cans.',
  expires_at: '2026-09-01T12:00:00.000Z',
  expired_at: null,
  cancelled_at: null,
};

describe('report sharing', () => {
  it('shares only available active reports and completed impact records', () => {
    expect(isReportShareable(availableReport, now)).toBe(true);
    expect(isReportShareable({ ...availableReport, cleanup_state: 'completed' }, now)).toBe(true);
    expect(isReportShareable({ ...availableReport, cleanup_state: 'claimed' }, now)).toBe(false);
    expect(isReportShareable({ ...availableReport, cleanup_state: 'completion_submitted' }, now)).toBe(false);
    expect(isReportShareable({ ...availableReport, cleanup_state: 'changes_requested' }, now)).toBe(false);
    expect(isReportShareable({ ...availableReport, expired_at: now.toISOString() }, now)).toBe(false);
  });

  it('builds branded active-report content with a durable link', () => {
    const model = createReportShareModel({
      report: availableReport,
      beforePhotoUrl: 'https://example.com/before.jpg',
    });
    const message = formatReportShareMessage(model);

    expect(model).toMatchObject({
      state: 'active',
      generalLocation: 'Open Litterbugs to view the report location',
      photos: { before: 'https://example.com/before.jpg', after: null },
      extensions: { funding: null },
    });
    expect(message).toContain('Litterbugs · Cleanup needed');
    expect(message).toContain('Severity: Medium');
    expect(message).toContain('Near a creek · Plastic bottles and cans.');
    expect(message).toContain('https://litterbugs.app/reports/report-1');
    expect(message).not.toContain('35.601');
    expect(message).not.toContain('-82.554');
  });

  it('supports an active report without a photo or optional details', () => {
    const model = createReportShareModel({
      report: {
        ...availableReport,
        title: '  ',
        severity: null,
        notes_presets: null,
        notes_other: null,
      },
    });

    expect(model).toMatchObject({
      state: 'active',
      title: 'Litter Report',
      severity: null,
      reportNotes: null,
      photos: { before: null, after: null },
    });
    expect(formatReportShareMessage(model)).toContain('needs a volunteer cleanup');
  });

  it('builds completed impact content without requiring optional details', () => {
    const model = createReportShareModel({
      report: { ...availableReport, cleanup_state: 'completed' },
      impact: {
        cleaner: { display_name: 'Jordan' },
        attempt: { completed_at: '2026-08-27T16:30:00.000Z' },
        submission: {
          description: 'Removed litter from both sides of the trail.',
          bags_or_items_removed: 2,
          duration_minutes: 35,
        },
      },
      beforePhotoUrl: 'https://example.com/before.jpg',
      afterPhotoUrl: 'https://example.com/after.jpg',
    });
    const message = formatReportShareMessage(model);

    expect(message).toContain('Litterbugs · Cleanup complete');
    expect(message).toContain('cleaned by Jordan');
    expect(message).toContain('2 bags/items removed · 35 minutes volunteered');
    expect(model.photos).toEqual({
      before: 'https://example.com/before.jpg',
      after: 'https://example.com/after.jpg',
    });
  });

  it('falls back safely when completed impact details and photos are missing', () => {
    const model = createReportShareModel({
      report: { ...availableReport, cleanup_state: 'completed' },
      impact: {
        cleaner: { email: 'private@example.com', phone: '555-0100' },
        attempt: null,
        submission: null,
      },
    });
    const message = formatReportShareMessage(model);

    expect(model).toMatchObject({
      state: 'completed',
      cleanerName: 'a Litterbugs volunteer',
      completionDate: null,
      cleanupDescription: null,
      impact: { bagsOrItemsRemoved: null, durationMinutes: null },
      photos: { before: null, after: null },
    });
    expect(message).not.toContain('private@example.com');
    expect(message).not.toContain('555-0100');
    expect(message).not.toContain('35.60091');
    expect(message).not.toContain('-82.55404');
  });

  it('uses a separate URL on iOS and an inline URL on Android', () => {
    const model = createReportShareModel({ report: availableReport });
    const iosContent = createNativeReportShareContent(model, 'ios');
    const androidContent = createNativeReportShareContent(model, 'android');

    expect(iosContent.url).toBe(model.reportUrl);
    expect(iosContent.message).not.toContain(model.reportUrl);
    expect(androidContent.message).toContain(model.reportUrl);
  });

  it('uses the completed-state Share Your Impact label', () => {
    expect(reportShareActionLabel(availableReport)).toBe('Share');
    expect(reportShareActionLabel({ ...availableReport, cleanup_state: 'completed' }))
      .toBe('Share Your Impact');
  });

  it('opens the system sheet, reports cancellation, and does not mutate report state', async () => {
    const report = { ...availableReport, cleanup_state: 'completed' };
    const original = JSON.stringify(report);
    const share = vi.fn().mockResolvedValue({ action: 'dismissedAction' });

    const result = await shareReportWithSystemSheet({
      report,
      platform: 'ios',
      share,
      dismissedAction: 'dismissedAction',
    });

    expect(result.status).toBe('dismissed');
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Litterbugs cleanup complete',
        url: 'https://litterbugs.app/reports/report-1',
      }),
      { dialogTitle: 'Share cleanup impact' },
    );
    expect(JSON.stringify(report)).toBe(original);
  });

  it('does not open the system sheet for pending or in-progress reports', async () => {
    const share = vi.fn();

    for (const cleanup_state of ['claimed', 'completion_submitted', 'changes_requested']) {
      const result = await shareReportWithSystemSheet({
        report: { ...availableReport, cleanup_state },
        platform: 'android',
        share,
      });
      expect(result.status).toBe('unavailable');
    }

    expect(share).not.toHaveBeenCalled();
  });
});
