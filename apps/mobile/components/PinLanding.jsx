import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import BrandBug from './BrandBug';
import MapPin, { pinHeight } from './MapPin';

// The website's pin arrival (apps/web/app/globals.css: bug-land, bug-drop, bug-dragonfly-in,
// bug-ripple), drawn in a layer above the map rather than inside the map's own pins. A map
// pin must stay perfectly still: an animation finishing inside one makes the map lose its
// place and draw it in the corner of the screen. So the real pin waits, invisible, while
// this stand-in lands at the same spot; then the real pin is shown and this is removed.
const ANCHOR_WIDTH = 240;
const CURVE = Easing.bezier(0.3, 1.5, 0.5, 1); // the website's cubic-bezier(.3, 1.5, .5, 1)

export default function PinLanding({ x, y, kind, text, order = 0, posted = false, handover = false, onDone }) {
  const land = useRef(new Animated.Value(0)).current;
  const carrier = useRef(new Animated.Value(0)).current;
  const ripple = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const steps = [Animated.timing(land, { toValue: 1, duration: 520, delay: posted ? 850 : Math.min(order, 8) * 60, easing: CURVE, useNativeDriver: true })];
    if (posted) {
      steps.push(Animated.timing(carrier, { toValue: 1, duration: 1000, easing: Easing.bezier(0.45, 0, 0.25, 1), useNativeDriver: true }));
      steps.push(Animated.timing(ripple, { toValue: 1, duration: 700, delay: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    }
    const all = Animated.parallel(steps);
    all.start(({ finished }) => { if (finished) onDone?.(); });
    return () => all.stop();
    // Plays once, straight away.
  }, []);

  // bug-land: 0% { opacity 0; y -20; scale .6; rotate -8deg } 70% { opacity 1; y 2; scale 1.04; rotate 4deg } 100% { at rest }
  // bug-drop: from { opacity 0; y -28; scale .7 } to { at rest }
  const clamp = { extrapolate: 'clamp' };
  const style = posted ? {
    opacity: land.interpolate({ inputRange: [0, 1], outputRange: [0, 1], ...clamp }),
    transform: [
      { translateY: land.interpolate({ inputRange: [0, 1], outputRange: [-28, 0] }) },
      { scale: land.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
    ],
  } : {
    opacity: land.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 1, 1], ...clamp }),
    transform: [
      { translateY: land.interpolate({ inputRange: [0, 0.7, 1], outputRange: [-20, 2, 0] }) },
      { scale: land.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.6, 1.04, 1] }) },
      { rotate: land.interpolate({ inputRange: [0, 0.7, 1], outputRange: ['-8deg', '4deg', '0deg'] }) },
    ],
  };
  return (
    // Anchored like the real pin: the bottom centre (the tail's tip) sits on the spot.
    // The box is as tall as the pin and wide enough for any pin, so nothing waits to be measured.
    <View pointerEvents="none" style={[styles.anchor, { left: x - ANCHOR_WIDTH / 2, top: y - pinHeight(kind, text), height: pinHeight(kind, text) }]}>
      {posted ? (
        <Animated.View style={[styles.ripple, { opacity: ripple.interpolate({ inputRange: [0, 0.01, 1], outputRange: [0, 0.9, 0] }), transform: [{ scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2] }) }] }]} />
      ) : null}
      <Animated.View style={style}>
        {/* Once the real pin is shown under it, this pin's shadow goes so two never stack. */}
        <MapPin kind={kind} text={text} shadow={!handover} />
      </Animated.View>
      {posted ? (
        <Animated.View style={[styles.carrier, {
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
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute', width: ANCHOR_WIDTH, alignItems: 'center', justifyContent: 'flex-end' },
  carrier: { position: 'absolute', top: 0, alignSelf: 'center' },
  ripple: { position: 'absolute', bottom: -4, alignSelf: 'center', width: 30, height: 10, borderWidth: 2, borderColor: '#9B8CEC', borderRadius: 15 },
});
