import { describe, expect, it } from 'vitest';
import { parsePeriod, ratio, reportWindow, totalVisits, validateData } from './model';

describe('owner dashboard measurement rules', () => {
  it('combines visits only when both web and app counts are available', () => {
    expect(totalVisits(108, 25)).toBe(133);
    expect(totalVisits(108, 0)).toBe(108);
    expect(totalVisits(108, null)).toBeNull();
    expect(totalVisits(undefined, 25)).toBeNull();
  });
  it('uses complete local dates across the daylight saving boundary', () => {
    expect(reportWindow(7, 'America/New_York', 1, new Date('2026-11-03T03:00:00Z'))).toEqual({ start: '2026-10-26', end: '2026-11-01', timezone: 'America/New_York' });
    expect(reportWindow(28, 'America/Los_Angeles', 3, new Date('2026-11-13T13:00:00Z'))).toEqual({ start: '2026-10-14', end: '2026-11-10', timezone: 'America/Los_Angeles' });
  });
  it('does not turn unknown values or an empty denominator into zero percent', () => {
    expect(ratio(0, 0)).toBeNull();
    expect(ratio(null, 10)).toBeNull();
    expect(ratio(0, 10)).toBe(0);
    expect(ratio(36, 108)).toBeCloseTo(1 / 3);
  });
  it('only accepts bounded predefined date choices', () => {
    expect(parsePeriod('28')).toBe(28);
    for (const input of ['36500', '../secrets', ['28'], undefined]) expect(parsePeriod(input)).toBe(7);
  });
  it('whitelists snapshot fields and distinguishes missing from observed zero', () => {
    const data = validateData('clarity', { sessions: 21, deadSessions: 1, rageSessions: 0, quickBackSessions: 4, email: 'private@example.invalid', token: 'secret' });
    expect(data).toEqual({ sessions: 21, deadSessions: 1, rageSessions: 0, quickBackSessions: 4, scriptErrorSessions: null });
    expect(() => validateData('ga', { sessions: null })).toThrow();
  });
});
