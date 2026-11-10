// Rank art matches the website's CommunityRank (apps/web components/community-rank.tsx):
// logo bugs for Ladybug, Honeybee and Butterfly; flat drawings for the rest.
export const RANK_ASSETS = Object.freeze({
  gnat: require('../assets/bugs/gnat.png'),
  ladybug: require('../assets/bugs/ladybug.png'),
  honeybee: require('../assets/bugs/bee.png'),
  'lightning-bug': require('../assets/bugs/lightning-bug.png'),
  caterpillar: require('../assets/bugs/caterpillar.png'),
  cocoon: require('../assets/bugs/cocoon.png'),
  butterfly: require('../assets/bugs/butterfly.png'),
  dragonfly: require('../assets/bugs/dragonfly.png'),
});
export function getRankAsset(rank) {
  return RANK_ASSETS[rank?.assetKey] ?? RANK_ASSETS.gnat;
}
