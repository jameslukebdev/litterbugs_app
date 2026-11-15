import { describe, expect, it } from 'vitest';
import { buildRankPath, EMPTY_SHOWN, type RankPointEvent } from './rank-path';

const report = (day: number): RankPointEvent => ({ kind: 'report', points: 1, earnedAt: `2026-11-${String(day).padStart(2, '0')}T12:00:00Z` });
const clean = (day: number): RankPointEvent => ({ kind: 'clean', points: 3, earnedAt: `2026-11-${String(day).padStart(2, '0')}T12:00:00Z` });

describe('buildRankPath', () => {
  it('starts a new member on one empty stone before Ladybug', () => {
    const path = buildRankPath([]);
    expect(path.rank.name).toBe('Gnat');
    expect(path.next?.name).toBe('Ladybug');
    expect(path.toGo).toBe(1);
    expect(path.stones).toEqual([{ point: 0, state: 'next' }]);
    expect(path.folded).toBe(0);
  });

  it('fills a stone per accepted report and three per confirmed cleanup', () => {
    // 5 points: Ladybug (1) on the way to Honeybee (12).
    const path = buildRankPath([report(2), report(4), clean(9)]);
    expect(path.total).toBe(5);
    expect(path.rank.name).toBe('Ladybug');
    expect(path.next?.name).toBe('Honeybee');
    expect(path.toGo).toBe(7);
    const states = path.stones.map(stone => stone.state === 'earned' ? `${stone.kind}${stone.first ? '*' : ''}` : stone.state);
    // Point 0 (the first report) belongs to the Gnat stretch; this stretch starts at point 1.
    expect(states).toEqual(['report*', 'clean*', 'clean', 'clean', 'next', 'empty', 'empty', 'empty']);
    expect(path.folded).toBe(12 - (5 + EMPTY_SHOWN + 1));
  });

  it('labels a cleanup that started in the last stretch on its first stone here', () => {
    // 10 reports then a cleanup: points 10, 11 and 12; Honeybee starts at 12.
    const path = buildRankPath([...Array.from({ length: 10 }, (_, index) => report(index + 1)), clean(20)]);
    expect(path.rank.name).toBe('Honeybee');
    expect(path.stones[0]).toMatchObject({ point: 12, state: 'earned', kind: 'clean', first: true });
  });

  it('folds a long stretch of empty stones into one marker', () => {
    // 38 points: Lightning Bug (30) to Caterpillar (60).
    const path = buildRankPath([...Array.from({ length: 5 }, (_, index) => clean(index + 1)), ...Array.from({ length: 23 }, (_, index) => report(index + 1))]);
    expect(path.total).toBe(38);
    expect(path.next?.name).toBe('Caterpillar');
    expect(path.stones.at(-1)).toEqual({ point: 41, state: 'empty' });
    expect(path.folded).toBe(18);
  });

  it('has no path past the highest rank', () => {
    const path = buildRankPath(Array.from({ length: 50 }, (_, index) => clean((index % 28) + 1)));
    expect(path.rank.name).toBe('Dragonfly');
    expect(path.next).toBeNull();
    expect(path.stones).toEqual([]);
  });
});
