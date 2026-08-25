import { describe, expect, it } from 'vitest';

import { cleanupImpactFacts, formatCleanupDate } from './cleanupImpactPresentation';

describe('completed cleanup impact presentation', () => {
  it('presents optional impact values when provided', () => {
    expect(cleanupImpactFacts({
      bags_or_items_removed: 2,
      duration_minutes: 35,
    })).toEqual([
      { icon: 'bag-handle-outline', label: '2 bags/items removed' },
      { icon: 'time-outline', label: '35 minutes volunteered' },
    ]);
  });

  it('omits optional impact values when they were not submitted', () => {
    expect(cleanupImpactFacts({
      bags_or_items_removed: null,
      duration_minutes: null,
    })).toEqual([]);
  });

  it('handles singular impact values and invalid dates', () => {
    expect(cleanupImpactFacts({
      bags_or_items_removed: 1,
      duration_minutes: 1,
    }).map(({ label }) => label)).toEqual([
      '1 bag/item removed',
      '1 minute volunteered',
    ]);
    expect(formatCleanupDate('not-a-date')).toBe('Cleanup date unavailable');
  });
});
