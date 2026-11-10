import { Image } from 'react-native';

// The logo bugs, matched to the website's BrandBug. Each bug labels a state
// or step (ladybug = needs a cleanup, flower = cleaned up), never decoration.
const BUGS = {
  bee: require('../assets/bugs/bee.png'),
  butterfly: require('../assets/bugs/butterfly.png'),
  flower: require('../assets/bugs/flower.png'),
  ladybug: require('../assets/bugs/ladybug.png'),
  // Flat bugs drawn from the website's SVGs (apps/web/public/brand/ranks/*.svg).
  caterpillar: require('../assets/bugs/caterpillar.png'),
  cocoon: require('../assets/bugs/cocoon.png'),
  dragonfly: require('../assets/bugs/dragonfly.png'),
  gnat: require('../assets/bugs/gnat.png'),
  'lightning-bug': require('../assets/bugs/lightning-bug.png'),
};

export default function BrandBug({ kind, size = 20, style }) {
  const source = BUGS[kind];
  if (!source) return null;
  return (
    <Image
      source={source}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessible={false}
      importantForAccessibility="no"
    />
  );
}
