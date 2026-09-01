export const RANK_ASSETS = Object.freeze({
  gnat: require('../assets/ranks/gnat.png'),
  ladybug: require('../assets/ranks/ladybug.png'),
  honeybee: require('../assets/ranks/honeybee.png'),
  'lightning-bug': require('../assets/ranks/lightning-bug.png'),
  caterpillar: require('../assets/ranks/caterpillar.png'),
  cocoon: require('../assets/ranks/cocoon.png'),
  butterfly: require('../assets/ranks/butterfly.png'),
  dragonfly: require('../assets/ranks/dragonfly.png'),
});

export function getRankAsset(rank) {
  return RANK_ASSETS[rank?.assetKey] ?? RANK_ASSETS.gnat;
}
