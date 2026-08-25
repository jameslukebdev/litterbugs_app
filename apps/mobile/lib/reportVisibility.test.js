import { describe, expect, it } from 'vitest';

import { completedImpactReportFilter } from './reportVisibility';

describe('report visibility', () => {
  it('keeps completed impact records visible after original expiration', () => {
    expect(completedImpactReportFilter('2026-08-25T12:00:00.000Z')).toBe(
      'cleanup_state.eq.completed,expires_at.gt.2026-08-25T12:00:00.000Z'
    );
  });
});
