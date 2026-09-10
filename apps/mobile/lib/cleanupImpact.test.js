import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { cleanupImpactFacts, formatCleanupDate } from './cleanupImpactPresentation';

const mapScreenSource = ['../MapScreen.js', '../components/ReportDetailsSheet.jsx'].map(path => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');
const completedStorySource = readFileSync(
  new URL('../CompletedCleanupStory.js', import.meta.url),
  'utf8'
);

describe('completed cleanup impact presentation', () => {
  it('presents optional impact values when provided', () => {
    expect(cleanupImpactFacts({
      bags_or_items_removed: 2,
      weight_pounds: 12.5,
    })).toEqual([
      { icon: 'bag-handle-outline', value: '2', caption: 'bags/items removed', label: '2 bags/items removed' },
      { icon: 'scale-outline', value: '12.5', caption: 'pounds removed', label: '12.5 pounds removed' },
    ]);
  });

  it('omits optional impact values when they were not submitted', () => {
    expect(cleanupImpactFacts({
      bags_or_items_removed: null,
      weight_pounds: null,
    })).toEqual([]);
  });

  it('handles singular impact values and invalid dates', () => {
    expect(cleanupImpactFacts({
      bags_or_items_removed: 1,
      weight_pounds: 1,
    }).map(({ label }) => label)).toEqual([
      '1 bag/item removed',
      '1 pound removed',
    ]);
    expect(formatCleanupDate('not-a-date')).toBe('Cleanup date unavailable');
  });

  it('reveals report sheets only after their layout data is ready', () => {
    expect(mapScreenSource).toContain('const reportDetailsPreparing = photosLoading');
    expect(mapScreenSource).toContain('|| cleanupAttemptLoading');
    expect(mapScreenSource).toContain('&& completedCleanupImpactLoading');
    expect(mapScreenSource).toContain('styles.reportDetailsLoadingOverlay');
    expect(mapScreenSource).toContain('Loading report…');
    expect(mapScreenSource).toContain('Loading completed report…');
    expect(completedStorySource).not.toContain('BrandedLoadingState');
  });
});
