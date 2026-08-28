import { describe, expect, it } from 'vitest';

import {
  isPubliclyShareableReport,
  publicReportShareDescription,
  type PublicReportShareModel,
} from '@/lib/public-report-share-model';

const now = new Date('2026-08-28T12:00:00.000Z');

describe('public report sharing', () => {
  it('exposes only available active and completed reports', () => {
    const base = {
      cleanup_state: 'available',
      cancelled_at: null,
      expired_at: null,
      expires_at: '2026-09-01T12:00:00.000Z',
    };

    expect(isPubliclyShareableReport(base, now)).toBe(true);
    expect(isPubliclyShareableReport({ ...base, cleanup_state: 'completed' }, now)).toBe(true);
    expect(isPubliclyShareableReport({ ...base, cleanup_state: 'claimed' }, now)).toBe(false);
    expect(isPubliclyShareableReport({ ...base, expires_at: '2026-08-27T12:00:00.000Z' }, now)).toBe(false);
  });

  it('keeps coordinates private and uses state-specific descriptions', () => {
    const model = {
      id: 'report-1',
      state: 'completed',
      title: 'Trail cleanup',
      generalLocation: 'Open Litterbugs to view the report location',
      cleanerName: 'Jordan',
    } as PublicReportShareModel;

    expect(publicReportShareDescription(model)).toContain('cleaned by Jordan');
    expect(publicReportShareDescription({ ...model, state: 'available' })).not.toMatch(/35\.600|-82\.554/);
  });
});
