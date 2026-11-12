import { useEffect, useRef } from 'react';
import { Image } from 'react-native';
import { Animated } from '../lib/safeAnimated';
import { prefersReducedMotion } from '../lib/reduceMotion';

// The logo bugs, matched to the website's BrandBug. Each bug labels a state
// or step (ladybug = needs a cleanup, flower = cleaned up), never decoration.
const BUGS = {
  ant: require('../assets/bugs/ant.png'),
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

const steps = (count) => Array.from({ length: count }, (_, index) => index / (count - 1));
const twice = (values) => [...values, ...values.slice(1)];

// Every bug has its own move, as on the website (apps/web/app/globals.css, "Bug motion"):
// the ladybug waddles, the bee buzzes, the butterfly flaps, the dragonfly darts, the
// caterpillar inches, the flower spins open, the lightning bug pulses, the cocoon wiggles.
// Each ends where it started. `t` runs 0 to 1.
const MOVES = {
  ladybug: { duration: 620, transform: (t) => [
    { rotate: t.interpolate({ inputRange: steps(5), outputRange: ['0deg', '-12deg', '0deg', '12deg', '0deg'] }) },
    { translateX: t.interpolate({ inputRange: steps(5), outputRange: [0, -1, 0, 1, 0] }) },
  ] },
  bee: { duration: 840, transform: (t) => [
    { translateX: t.interpolate({ inputRange: steps(11), outputRange: twice([0, 1, -1, 1, -1, 0]) }) },
    { translateY: t.interpolate({ inputRange: steps(11), outputRange: twice([0, -2, -1, -2, 0, 0]) }) },
    { rotate: t.interpolate({ inputRange: steps(11), outputRange: twice(['0deg', '-6deg', '5deg', '-4deg', '3deg', '0deg']) }) },
  ] },
  butterfly: { duration: 520, transform: (t) => [
    { scaleX: t.interpolate({ inputRange: steps(5), outputRange: [1, 0.55, 1, 0.6, 1] }) },
  ] },
  dragonfly: { duration: 460, transform: (t) => [
    { translateX: t.interpolate({ inputRange: [0, 0.3, 0.55, 0.75, 1], outputRange: [0, 7, -2, 2, 0] }) },
    { translateY: t.interpolate({ inputRange: [0, 0.3, 0.55, 0.75, 1], outputRange: [0, -4, 1, -1, 0] }) },
  ] },
  caterpillar: { duration: 760, transform: (t) => [
    { scaleX: t.interpolate({ inputRange: steps(5), outputRange: [1, 0.78, 1, 0.78, 1] }) },
    { scaleY: t.interpolate({ inputRange: steps(5), outputRange: [1, 1.18, 1, 1.18, 1] }) },
  ] },
  flower: { duration: 560, transform: (t) => [
    { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
    { scale: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.22, 1] }) },
  ] },
  'lightning-bug': { duration: 800, transform: (t) => [
    { scale: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.12, 1] }) },
  ] },
  cocoon: { duration: 900, transform: (t) => [
    { rotate: t.interpolate({ inputRange: steps(6), outputRange: ['0deg', '-14deg', '11deg', '-7deg', '4deg', '0deg'] }) },
  ] },
};

// How a bug arrives: 'bloom' opens from nothing with a quarter turn (a ladybug becoming
// a flower); 'walk' walks in from the left on its side, then stands up (empty lists).
const ENTRANCES = {
  bloom: { duration: 560, style: (e) => ({ opacity: e.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }), transform: [
    { scale: e.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 1.12, 1] }) },
    { rotate: e.interpolate({ inputRange: [0, 1], outputRange: ['90deg', '0deg'] }) },
  ] }) },
  walk: { duration: 1100, delay: 200, style: (e) => ({ opacity: e.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }), transform: [
    { translateX: e.interpolate({ inputRange: [0, 0.7, 1], outputRange: [-120, 5, 0] }) },
    { rotate: e.interpolate({ inputRange: [0, 0.7, 1], outputRange: ['80deg', '80deg', '0deg'] }) },
  ] }) },
};

/**
 * `playKey`: change it (for example, a counter bumped on press) to make the bug do its move.
 * `entrance`: 'bloom' or 'walk', played once when the bug appears (and again when `entranceKey` changes).
 * `active`: the bug does its move each time this becomes true.
 * `loop`: repeat the move for as long as this is true.
 * `playOnMount`: also do the move once on arrival.
 * With none of these the bug is a plain still image.
 */
export default function BrandBug({ kind, size = 20, style, playKey, active, loop = false, playOnMount = false, entrance = null, entranceKey }) {
  const source = BUGS[kind];
  // Some test doubles of react-native have no Animated; the bug is then simply still.
  const canAnimate = Boolean(Animated?.Value);
  const move = useRef(canAnimate ? new Animated.Value(0) : null).current;
  const arrive = useRef(canAnimate ? new Animated.Value(entrance ? 0 : 1) : null).current;
  const firstPlay = useRef(true);
  const animated = canAnimate && (playKey !== undefined || active !== undefined || loop || playOnMount || Boolean(entrance));
  // `loop`: keep doing the move while something is in progress (the lightning bug while locating).
  useEffect(() => {
    const spec = MOVES[kind];
    if (!loop || !spec || !move || prefersReducedMotion()) return undefined;
    move.setValue(0);
    const animation = Animated.loop(Animated.timing(move, { toValue: 1, duration: spec.duration, useNativeDriver: true }));
    animation.start();
    return () => { animation.stop(); move.setValue(0); };
  }, [loop, kind, move]);
  // `active`: the bug does its move each time this turns true (a choice being picked).
  const wasActive = useRef(Boolean(active));
  useEffect(() => {
    const spec = MOVES[kind];
    const turnedOn = Boolean(active) && !wasActive.current;
    wasActive.current = Boolean(active);
    if (!turnedOn || !spec || !move || prefersReducedMotion()) return;
    move.setValue(0);
    Animated.timing(move, { toValue: 1, duration: spec.duration, useNativeDriver: true }).start(({ finished }) => { if (finished) move.setValue(0); });
  }, [active, kind, move]);

  useEffect(() => {
    const skip = firstPlay.current && !playOnMount;
    firstPlay.current = false;
    const spec = MOVES[kind];
    if (skip || !spec || !move || prefersReducedMotion()) return undefined;
    move.setValue(0);
    const animation = Animated.timing(move, { toValue: 1, duration: spec.duration, delay: playOnMount && entrance ? 1300 : 0, useNativeDriver: true });
    animation.start(({ finished }) => { if (finished) move.setValue(0); });
    return () => animation.stop();
  }, [playKey, kind, move, playOnMount, entrance]);

  useEffect(() => {
    const spec = ENTRANCES[entrance];
    if (!spec || !arrive) return undefined;
    if (prefersReducedMotion()) { arrive.setValue(1); return undefined; }
    arrive.setValue(0);
    const animation = Animated.timing(arrive, { toValue: 1, duration: spec.duration, delay: spec.delay || 0, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [entrance, entranceKey, arrive]);

  if (!source) return null;
  const sizing = [{ width: size, height: size }, style];
  if (!animated) {
    return <Image source={source} style={sizing} resizeMode="contain" accessible={false} importantForAccessibility="no" />;
  }
  const moveSpec = MOVES[kind];
  const image = (
    <Animated.Image
      source={source}
      style={[...sizing, moveSpec ? { transform: moveSpec.transform(move) } : null]}
      resizeMode="contain"
      accessible={false}
      importantForAccessibility="no"
    />
  );
  return ENTRANCES[entrance] ? <Animated.View style={ENTRANCES[entrance].style(arrive)}>{image}</Animated.View> : image;
}
