import { describe, expect, it } from 'vitest';

import {
  createNativeReportShareContent,
  createReportShareModel,
  formatReportShareMessage,
  isReportShareable,
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

  it('uses a separate URL on iOS and an inline URL on Android', () => {
    const model = createReportShareModel({ report: availableReport });
    const iosContent = createNativeReportShareContent(model, 'ios');
    const androidContent = createNativeReportShareContent(model, 'android');

    expect(iosContent.url).toBe(model.reportUrl);
    expect(iosContent.message).not.toContain(model.reportUrl);
    expect(androidContent.message).toContain(model.reportUrl);
  });
});
