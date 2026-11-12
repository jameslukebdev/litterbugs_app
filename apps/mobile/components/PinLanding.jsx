import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import BrandBug from './BrandBug';
import MapPin from './MapPin';

// The website's pin arrival (apps/web/app/globals.css: bug-land, bug-drop, bug-dragonfly-in,
// bug-ripple), drawn in a layer above the map rather than inside the map's own pins. A map
// pin must stay perfectly still: an animation finishing inside one makes the map lose its
// place and draw it in the corner of the screen. So the real pin waits, invisible, while
// this stand-in lands at the same spot; then the real pin is shown and this is removed.
const CURVE = Easing.bezier(0.3, 1.5, 0.5, 1); // the website's cubic-bezier(.3, 1.5, .5, 1)

export default function PinLanding({ x, y, kind, text, order = 0, posted = false, onDone }) {
  const land = useRef(new Animated.Value(0)).current;
  const carrier = useRef(new Animated.Value(0)).current;
  const ripple = useRef(new Animated.Value(0)).current;
  // Measured so the stand-in's tail tip sits exactly where the real pin's will (same anchor).
  const [size, setSize] = useState(null);
  useEffect(() => {
    if (!size) return undefined;
    const steps = [Animated.timing(land, { toValue: 1, duration: 520, delay: posted ? 850 : Math.min(order, 8) * 60, easing: CURVE, useNativeDriver: true })];
    if (posted) {
      steps.push(Animated.timing(carrier, { toValue: 1, duration: 1000, easing: Easing.bezier(0.45, 0, 0.25, 1), useNativeDriver: true }));
      steps.push(Animated.timing(ripple, { toValue: 1, duration: 700, delay: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    }
    const all = Animated.parallel(steps);
    all.start(({ finished }) => { if (finished) onDone?.(); });
    return () => all.stop();
    // Plays once, as soon as the stand-in has been measured.
  }, [Boolean(size)]);

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
    <View
      pointerEvents="none"
      onLayout={({ nativeEvent }) => { if (!size) setSize(nativeEvent.layout); }}
      style={[styles.anchor, size ? { left: x - size.width / 2, top: y - size.height } : { left: x, top: y, opacity: 0 }]}
    >
      {posted ? (
        <Animated.View style={[styles.ripple, { opacity: ripple.interpolate({ inputRange: [0, 0.01, 1], outputRange: [0, 0.9, 0] }), transform: [{ scale: ripple.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2] }) }] }]} />
      ) : null}
      <Animated.View style={style}>
        <MapPin kind={kind} text={text} />
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
  anchor: { position: 'absolute', alignItems: 'center' },
  carrier: { position: 'absolute', top: 0, alignSelf: 'center' },
  ripple: { position: 'absolute', bottom: -4, alignSelf: 'center', width: 30, height: 10, borderWidth: 2, borderColor: '#9B8CEC', borderRadius: 15 },
});
