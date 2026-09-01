import { describe, expect, it } from 'vitest';

import {
  RANKS,
  didCrossRankThreshold,
  getCrossedRanks,
  getNextRank,
  getPointsRemaining,
  getPendingRankCelebration,
  getRankProgress,
  getRankForPoints,
  getRankProgressPercentage,
  getRankingSummary,
} from './ranking';

describe('ranking configuration', () => {
  it.each([
    [0, 'Gnat'],
    [1, 'Ladybug'],
    [11, 'Ladybug'],
    [12, 'Honeybee'],
    [29, 'Honeybee'],
    [30, 'Lightning Bug'],
    [149, 'Butterfly'],
    [150, 'Dragonfly'],
    [999, 'Dragonfly'],
  ])('maps %i points to %s', (points, expectedRank) => {
    expect(getRankForPoints(points).name).toBe(expectedRank);
  });

  it('keeps the approved rank thresholds in one ordered configuration', () => {
    expect(RANKS.map(({ name, minPoints }) => ({ name, minPoints }))).toEqual([
      { name: 'Gnat', minPoints: 0 },
      { name: 'Ladybug', minPoints: 1 },
      { name: 'Honeybee', minPoints: 12 },
      { name: 'Lightning Bug', minPoints: 30 },
      { name: 'Caterpillar', minPoints: 60 },
      { name: 'Cocoon', minPoints: 90 },
      { name: 'Butterfly', minPoints: 120 },
      { name: 'Dragonfly', minPoints: 150 },
    ]);
  });

  it('returns the next rank and points remaining', () => {
    expect(getNextRank(11)?.name).toBe('Honeybee');
    expect(getPointsRemaining(11)).toBe(1);
    expect(getNextRank(150)).toBeNull();
    expect(getPointsRemaining(150)).toBe(0);
  });

  it('calculates progress within the current rank', () => {
    expect(getRankProgress(42)).toBe(0.4);
    expect(getRankProgress(168)).toBe(1);
    expect(getRankProgressPercentage(0)).toBe(0);
    expect(getRankProgressPercentage(1)).toBe(0);
    expect(getRankProgressPercentage(11)).toBeCloseTo((10 / 11) * 100);
    expect(getRankProgressPercentage(150)).toBe(100);
  });

  it('builds a complete ranking summary from points', () => {
    expect(getRankingSummary(42)).toEqual({
      points: 42,
      rank: 'Lightning Bug',
      rankMin: 30,
      nextRank: 'Caterpillar',
      nextRankAt: 60,
      pointsRemaining: 18,
      progress: 0.4,
    });

    expect(getRankingSummary(168)).toEqual({
      points: 168,
      rank: 'Dragonfly',
      rankMin: 150,
      nextRank: null,
      nextRankAt: null,
      pointsRemaining: 0,
      progress: 1,
    });
  });

  it('detects one or more crossed thresholds without treating point loss as rank-up', () => {
    expect(didCrossRankThreshold(0, 1)).toBe(true);
    expect(didCrossRankThreshold(12, 29)).toBe(false);
    expect(didCrossRankThreshold(149, 150)).toBe(true);
    expect(didCrossRankThreshold(30, 12)).toBe(false);
    expect(getCrossedRanks(11, 31).map(({ name }) => name)).toEqual([
      'Honeybee',
      'Lightning Bug',
    ]);
  });

  it('selects only the highest pending rank celebration', () => {
    expect(getPendingRankCelebration(12, 30)?.name).toBe('Lightning Bug');
    expect(getPendingRankCelebration(0, 15)?.name).toBe('Honeybee');
    expect(getPendingRankCelebration(0, 168)?.name).toBe('Dragonfly');
    expect(getPendingRankCelebration(15, 15)).toBeNull();
    expect(getPendingRankCelebration(30, 30)).toBeNull();
    expect(getPendingRankCelebration(30, 12)).toBeNull();
  });
});
