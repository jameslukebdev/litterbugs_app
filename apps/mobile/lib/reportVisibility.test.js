import { describe, expect, it } from 'vitest';

import { completedImpactReportFilter, isVisibleReport } from './reportVisibility';

describe('report visibility', () => {
  it('keeps completed impact records visible after original expiration', () => {
    expect(completedImpactReportFilter('2026-08-25T12:00:00.000Z')).toBe(
      'cleanup_state.eq.completed,expires_at.gt.2026-08-25T12:00:00.000Z'
    );
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
