/** Rank ladder for leaderboard rows. Keep thresholds in sync with components/community-rank.tsx and mobile/lib/ranking.js. */
export const RANKS = [
  { name: 'Gnat', points: 0, artwork: '/brand/ranks/gnat.svg' },
  { name: 'Ladybug', points: 1, artwork: '/brand/ranks/ladybug.svg' },
  { name: 'Honeybee', points: 12, artwork: '/brand/bugs/bee.png' },
  { name: 'Lightning Bug', points: 30, artwork: '/brand/ranks/lightning-bug.svg' },
  { name: 'Caterpillar', points: 60, artwork: '/brand/ranks/caterpillar.svg' },
  { name: 'Cocoon', points: 90, artwork: '/brand/ranks/cocoon.svg' },
  { name: 'Butterfly', points: 120, artwork: '/brand/bugs/butterfly.png' },
  { name: 'Dragonfly', points: 150, artwork: '/brand/ranks/dragonfly.svg' },
] as const;

export function rankFor(points: number) {
  return RANKS.reduce<(typeof RANKS)[number]>((current, rank) => (points >= rank.points ? rank : current), RANKS[0]);
}

/** Each board's action, bug and words: Clean = butterfly, Report = dragonfly, Fund = bee (as everywhere on the site). */
export const BOARD_COPY = {
  clean: { tab: 'Cleaners', bug: '/brand/bugs/butterfly.png', one: 'cleanup', many: 'cleanups', none: 'No cleanups', join: 'Clean one spot', title: 'Cleanup Champion' },
  report: { tab: 'Reporters', bug: '/brand/ranks/dragonfly.svg', one: 'report', many: 'reports', none: 'No reports', join: 'Report one spot', title: 'Top Reporter' },
  fund: { tab: 'Funders', bug: '/brand/bugs/bee.png', one: 'cleanup funded', many: 'cleanups funded', none: 'No cleanups funded', join: 'Fund one cleanup', title: 'Top Funder' },
} as const;

export const ordinal = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;
export const daysLeftLabel = (days: number) => (days <= 0 ? 'Ends today' : days === 1 ? '1 day left' : `${days} days left`);
