import { describe, expect, it } from 'vitest';

import { completedImpactReportFilter, isVisibleReport } from './reportVisibility';

describe('report visibility', () => {
  it('keeps completed impact records visible after original expiration', () => {
    expect(completedImpactReportFilter('2026-08-25T12:00:00.000Z')).toBe(
      'cleanup_state.in.(completed,claimed,completion_submitted,changes_requested),expires_at.gt.2026-08-25T12:00:00.000Z'
    );
  });

  it.each(['claimed','completion_submitted','changes_requested'])('keeps active cleanup %s after its old discovery deadline', cleanup_state => {
    expect(isVisibleReport({cleanup_state,expires_at:'2026-01-01',expired_at:null,cancelled_at:null},new Date('2026-10-01'))).toBe(true);
  });
  it('never presents cancelled or expired reports as active content', () => {
    const now = new Date('2026-09-03T00:00:00.000Z');
    const active = {
      cleanup_state: 'available',
      expires_at: '2026-10-03T00:00:00.000Z',
      expired_at: null,
      cancelled_at: null,
    };

    expect(isVisibleReport(active, now)).toBe(true);
    expect(isVisibleReport({ ...active, cancelled_at: '2026-09-02T19:02:33.000Z' }, now))
      .toBe(false);
    expect(isVisibleReport({ ...active, expired_at: '2026-09-02T19:02:33.000Z' }, now))
      .toBe(false);
    expect(isVisibleReport({ ...active, expires_at: '2026-09-02T19:02:33.000Z' }, now))
      .toBe(false);
    expect(isVisibleReport({ ...active, expires_at: null }, now)).toBe(true);
    expect(isVisibleReport({ ...active, cleanup_state: 'completed' }, now)).toBe(true);
  });
});
