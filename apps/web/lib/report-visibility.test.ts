import { describe, expect, it } from 'vitest';
import { isDiscoverableReport, reportDiscoveryWindow } from './report-visibility';
const now = new Date('2026-09-23T00:00:00Z');
const report = { is_published: true, is_sample: false, cancelled_at: null, expired_at: null, cleanup_state: 'available', expires_at: '2026-10-01T00:00:00Z' };
describe('report discovery visibility', () => {
  it('keeps completed history after its old expiration, but excludes unfinished expired work', () => {
    expect(isDiscoverableReport({ ...report, expires_at: '2026-01-01' }, now)).toBe(false);
    expect(isDiscoverableReport({ ...report, cleanup_state: 'completed', expires_at: '2026-01-01' }, now)).toBe(true);
    expect(reportDiscoveryWindow(now)).toBe('cleanup_state.eq.completed,expires_at.gt.2026-09-23T00:00:00.000Z');
  });
  it.each([{ is_published: false }, { is_sample: true }, { cancelled_at: '2026-01-01' }, { expired_at: '2026-01-01' }])('keeps excluded reports private even if completed: %j', overrides => {
    expect(isDiscoverableReport({ ...report, cleanup_state: 'completed', ...overrides }, now)).toBe(false);
  });
});
