import { RANKS } from '@/components/community-leaderboard/ranks';

/** One rank point event, as public.my_rank_point_events returns it (oldest first). */
export type RankPointEvent = { kind: 'report' | 'clean'; points: number; earnedAt: string };

/** One stone on the path: a point earned (with the event that earned it), or an empty one still to earn. */
export type PathStone =
  | { point: number; state: 'earned'; kind: 'report' | 'clean'; earnedAt: string; first: boolean; points: number }
  | { point: number; state: 'next' | 'empty' };

export type RankPath = {
  total: number;
  rank: (typeof RANKS)[number];
  /** Null at the highest rank. */
  next: (typeof RANKS)[number] | null;
  toGo: number;
  stones: PathStone[];
  /** Empty stones after the shown ones, folded into one "+N more stones" marker. */
  folded: number;
};

/** Empty stones shown after the next one; the rest of a long stretch folds into one marker. */
export const EMPTY_SHOWN = 3;

/**
 * The stretch from your current rank bug to the next: one stone per point. Earned stones carry the event that
 * filled them (a confirmed cleanup fills three in a row); the first unearned stone is "next".
 */
export function buildRankPath(events: RankPointEvent[]): RankPath {
  const points = events.flatMap(event => Array.from({ length: Math.max(0, event.points) }, (_, part) => ({ event, part })));
  const total = points.length;
  const rankIndex = RANKS.reduce((current, step, index) => (total >= step.points ? index : current), 0);
  const rank = RANKS[rankIndex];
  const next = RANKS[rankIndex + 1] ?? null;
  if (!next) return { total, rank, next, toGo: 0, stones: [], folded: 0 };
  const lastShown = total + EMPTY_SHOWN;
  const stones: PathStone[] = [];
  for (let point = rank.points; point < next.points && point <= lastShown; point += 1) {
    const filled = points[point];
    if (filled) {
      // Label an event on its first stone, or on the first stone of this stretch when it began in the last one.
      stones.push({ point, state: 'earned', kind: filled.event.kind, earnedAt: filled.event.earnedAt, first: filled.part === 0 || point === rank.points, points: filled.event.points });
    } else stones.push({ point, state: point === total ? 'next' : 'empty' });
  }
  return { total, rank, next, toGo: next.points - total, stones, folded: Math.max(0, next.points - (lastShown + 1)) };
}
