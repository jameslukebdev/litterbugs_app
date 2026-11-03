import { expect, it } from 'vitest';
import type { PublicReportShareModel } from './public-report-share-model';
import { cleanupCompletionDate, cleanupOutcome } from './community-evidence';
it('keeps real completion dates stable across time zones and rejects unknown dates', () => {
  expect(cleanupCompletionDate('2026-10-28T23:00:00Z')).toBe('Oct 28, 2026');
  expect(cleanupCompletionDate(null)).toBeNull();
  expect(cleanupCompletionDate('invalid')).toBeNull();
});
it('distinguishes a recorded zero from missing measurements and labels reported weight', () => {
  expect(cleanupOutcome({ bagsOrItemsRemoved: 0, weightPounds: 0 } as PublicReportShareModel)).toBe('0 bags/items · 0 lb (cleaner-reported)');
  expect(cleanupOutcome({ bagsOrItemsRemoved: null, weightPounds: null } as PublicReportShareModel)).toBe('');
  expect(cleanupOutcome({ bagsOrItemsRemoved: 1, weightPounds: 2.5 } as PublicReportShareModel)).toBe('1 bag/item · 2.5 lb (cleaner-reported)');
});
it('omits malformed or negative quantities without making up impact totals', () => {
  expect(cleanupOutcome({ bagsOrItemsRemoved: -1, weightPounds: Infinity } as PublicReportShareModel)).toBe('');
});
