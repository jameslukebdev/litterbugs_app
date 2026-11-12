import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Animated } from '../lib/safeAnimated';
import { prefersReducedMotion } from '../lib/reduceMotion';
import BrandBug from './BrandBug';
import { colors, fonts } from '../lib/theme';

// Map pins and groups in the website's bug style (apps/web/app/globals.css,
// `.report-map-marker` / `.report-map-cluster`): a white pill or circle with the
// state's bug (ladybug = needs a cleanup, caterpillar = being cleaned, flower =
// cleaned up), visible text only for money or a group count, and a pointed tail
// whose tip is the exact spot. Anchor the marker at { x: 0.5, y: 1 }.

export const PIN_HEIGHT = 34;
export const PIN_TAIL = 9;

// Same artwork sizes as the website's BUGS table in lib/map-marker-glyph.ts.
const BUG_SIZE = {
  open: { kind: 'ladybug', width: 18, height: 20 },
  busy: { kind: 'caterpillar', width: 22, height: 22 },
  done: { kind: 'flower', width: 17, height: 16 },
};

// Resting and selected fill/edge per state, from the website's pin CSS.
const TONES = {
  open: { edge: '#ECE8F8', fill: colors.white, selectedEdge: '#ED8F97', selectedFill: '#FFF0F1' },
  busy: { edge: '#ECE8F8', fill: colors.white, selectedEdge: '#8CC366', selectedFill: '#ECF6E3' },
  done: { edge: '#ECE8F8', fill: colors.white, selectedEdge: '#6CC6AF', selectedFill: '#E2F8F3' },
};

/** Website pin kind for a report's cleanup state. */
export function pinKind(state) {
  if (state === 'completed') return 'done';
  if (state === 'claimed' || state === 'completion_submitted' || state === 'changes_requested') return 'busy';
  return 'open';
}

// How a pin arrives, as on the website (apps/web lib/map-marker-glyph.ts):
// - 'land': pins drop in and settle as results appear, a beat apart (`order`).
// - 'posted': a report you just filed is carried in by the dragonfly, then a ripple.
// A ladybug pin that becomes cleaned blooms into the flower, and the bug does its
// own move when the pin is chosen.
const LAND_MS = 520;

export default function MapPin({ kind = 'open', text = null, selected = false, entrance = null, order = 0 }) {
  const canAnimate = Boolean(Animated?.Value) && Boolean(entrance) && !prefersReducedMotion();
  const land = useRef(canAnimate ? new Animated.Value(0) : null).current;
  const carrier = useRef(canAnimate && entrance === 'posted' ? new Animated.Value(0) : null).current;
  const ripple = useRef(canAnimate && entrance === 'posted' ? new Animated.Value(0) : null).current;
  const [carried, setCarried] = useState(Boolean(carrier));
  useEffect(() => {
    if (!land) return undefined;
    const posted = entrance === 'posted';
    const animations = [Animated.timing(land, { toValue: 1, duration: LAND_MS, delay: posted ? 850 : Math.min(order, 8) * 60, useNativeDriver: true })];
    if (carrier) animations.push(Animated.timing(carrier, { toValue: 1, duration: 1000, useNativeDriver: true }));
    if (ripple) animations.push(Animated.timing(ripple, { toValue: 1, duration: 700, delay: 1100, useNativeDriver: true }));
    const all = Animated.parallel(animations);
    all.start(({ finished }) => { if (finished) setCarried(false); });
    return () => all.stop();
    // Plays once, when the pin first appears.
  }, []);

  // A pin that turns from needing a cleanup into cleaned blooms; choosing a pin makes its bug move.
  const previousKind = useRef(kind);
  const [bloomKey, setBloomKey] = useState(0);
  useEffect(() => {
    if (previousKind.current !== kind && previousKind.current !== 'done' && kind === 'done') setBloomKey(value => value + 1);
    previousKind.current = kind;
  }, [kind]);
  const [moveKey, setMoveKey] = useState(0);
  const wasSelected = useRef(selected);
  useEffect(() => {
    if (selected && !wasSelected.current) setMoveKey(value => value + 1);
    wasSelected.current = selected;
  }, [selected]);

  const bug = BUG_SIZE[kind] || BUG_SIZE.open;
  const tone = TONES[kind] || TONES.open;
  const edge = selected ? tone.selectedEdge : tone.edge;
  const fill = selected ? tone.selectedFill : tone.fill;
  const iconOnly = !text;
  const small = iconOnly && kind === 'done';
  const size = small ? 30 : PIN_HEIGHT;
  const landing = land ? (entrance === 'posted' ? {
    opacity: land,
    transform: [
      { translateY: land.interpolate({ inputRange: [0, 0.75, 1], outputRange: [-28, 2, 0] }) },
      { scale: land.interpolate({ inputRange: [0, 0.75, 1], outputRange: [0.7, 1.04, 1] }) },
    ],
  } : {
    opacity: land.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 1, 1] }),
    transform: [
      { translateY: land.interpolate({ inputRange: [0, 0.7, 1], outputRange: [-20, 2, 0] }) },
      { scale: land.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.6, 1.04, 1] }) },
      { rotate: land.interpolate({ inputRange: [0, 0.7, 1], outputRange: ['-8deg', '4deg', '0deg'] }) },
    ],
  }) : null;
  const Wrap = landing ? Animated.View : View;
  return (
    <>
    {carried && ripple ? (
      <Animated.View pointerEvents="none" style={[styles.ripple, { opacity: ripple.interpolate({ inputRange: [0, 0.01, 1], outputRange: [0, 0.9, 0] }), transform: [{ scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2] }) }] }]} />
    ) : null}
    <Wrap collapsable={false} style={[styles.wrap, selected && styles.selected, landing]}>
      <View style={[
        styles.pill,
        { height: size, minWidth: size, borderRadius: size / 2, borderColor: edge, backgroundColor: fill },
        iconOnly ? { width: size, paddingLeft: 0, paddingRight: 0 } : null,
      ]}>
        <BrandBug kind={bug.kind} style={{ width: bug.width, height: bug.height }} playKey={moveKey} entrance={bloomKey ? 'bloom' : null} entranceKey={bloomKey} />
        {text ? <Text allowFontScaling={false} numberOfLines={1} style={styles.text}>{text}</Text> : null}
      </View>
      {/* Tail: an edge-coloured triangle with a smaller fill triangle on top. */}
      <View style={[styles.tailEdge, { borderTopColor: edge }]} />
      <View style={[styles.tailFill, { borderTopColor: fill }]} />
    </Wrap>
    {carried && carrier ? (
      <Animated.View pointerEvents="none" style={[styles.carrier, {
        opacity: carrier.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateX: carrier.interpolate({ inputRange: [0, 0.8, 1], outputRange: [-130, -6, 0] }) },
          { translateY: carrier.interpolate({ inputRange: [0, 0.8, 1], outputRange: [-120, -34, -30] }) },
          { rotate: carrier.interpolate({ inputRange: [0, 0.8, 1], outputRange: ['30deg', '10deg', '0deg'] }) },
        ],
      }]}>
        <BrandBug kind="dragonfly" size={30} />
      </Animated.View>
    ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingBottom: PIN_TAIL,
    shadowColor: '#2A225A',
    shadowOpacity: 0.16,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 3 },
  },
  carrier: { position: 'absolute', top: 0, alignSelf: 'center' },
  ripple: { position: 'absolute', bottom: -4, alignSelf: 'center', width: 30, height: 10, borderWidth: 2, borderColor: '#9B8CEC', borderRadius: 15 },
  selected: { transform: [{ translateY: -3 }, { scale: 1.08 }] },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingLeft: 7,
    paddingRight: 12,
    borderWidth: 2,
    elevation: 3,
  },
  text: { color: colors.ink, fontFamily: fonts.heading, fontSize: 15, lineHeight: 18 },
  tailEdge: {
    position: 'absolute',
    bottom: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  tailFill: {
    position: 'absolute',
    bottom: 3,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});
