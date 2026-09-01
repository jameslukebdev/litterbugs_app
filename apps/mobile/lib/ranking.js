const createRank = (id, name, minPoints) => Object.freeze({
  id,
  name,
  minPoints,
  assetKey: id,
});

export const RANKS = Object.freeze([
  createRank('gnat', 'Gnat', 0),
  createRank('ladybug', 'Ladybug', 1),
  createRank('honeybee', 'Honeybee', 12),
  createRank('lightning-bug', 'Lightning Bug', 30),
  createRank('caterpillar', 'Caterpillar', 60),
  createRank('cocoon', 'Cocoon', 90),
  createRank('butterfly', 'Butterfly', 120),
  createRank('dragonfly', 'Dragonfly', 150),
]);

export const normalizeRankPoints = (points) => {
  const numericPoints = Number(points);
  if (!Number.isFinite(numericPoints)) return 0;
  return Math.max(0, Math.floor(numericPoints));
};

export function getRankForPoints(points) {
  const normalizedPoints = normalizeRankPoints(points);

  for (let index = RANKS.length - 1; index >= 0; index -= 1) {
    if (normalizedPoints >= RANKS[index].minPoints) return RANKS[index];
  }

  return RANKS[0];
}

export function getNextRank(points) {
  const currentRank = getRankForPoints(points);
  const currentIndex = RANKS.indexOf(currentRank);
  return RANKS[currentIndex + 1] ?? null;
}

export function getPointsRemaining(points) {
  const normalizedPoints = normalizeRankPoints(points);
  const nextRank = getNextRank(normalizedPoints);
  return nextRank ? Math.max(0, nextRank.minPoints - normalizedPoints) : 0;
}

export function getRankProgress(points) {
  const normalizedPoints = normalizeRankPoints(points);
  const currentRank = getRankForPoints(normalizedPoints);
  const nextRank = getNextRank(normalizedPoints);

  if (!nextRank) return 1;

  const rankRange = nextRank.minPoints - currentRank.minPoints;
  const earnedWithinRank = normalizedPoints - currentRank.minPoints;
  return Math.min(1, Math.max(0, earnedWithinRank / rankRange));
}

export function getRankProgressPercentage(points) {
  return getRankProgress(points) * 100;
}

export function getRankingSummary(points) {
  const normalizedPoints = normalizeRankPoints(points);
  const currentRank = getRankForPoints(normalizedPoints);
  const nextRank = getNextRank(normalizedPoints);

  return {
    points: normalizedPoints,
    rank: currentRank.name,
    rankMin: currentRank.minPoints,
    nextRank: nextRank?.name ?? null,
    nextRankAt: nextRank?.minPoints ?? null,
    pointsRemaining: getPointsRemaining(normalizedPoints),
    progress: getRankProgress(normalizedPoints),
  };
}

export function getCrossedRanks(previousPoints, currentPoints) {
  const normalizedPreviousPoints = normalizeRankPoints(previousPoints);
  const normalizedCurrentPoints = normalizeRankPoints(currentPoints);

  if (normalizedCurrentPoints <= normalizedPreviousPoints) return [];

  return RANKS.filter(({ minPoints }) => (
    minPoints > normalizedPreviousPoints && minPoints <= normalizedCurrentPoints
  ));
}

export function didCrossRankThreshold(previousPoints, currentPoints) {
  return getCrossedRanks(previousPoints, currentPoints).length > 0;
}

export function getPendingRankCelebration(celebratedThroughPoints, currentPoints) {
  const celebratedRank = getRankForPoints(celebratedThroughPoints);
  const currentRank = getRankForPoints(currentPoints);

  return currentRank.minPoints > celebratedRank.minPoints ? currentRank : null;
}
