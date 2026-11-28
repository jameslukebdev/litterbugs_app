import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { Animated } from '../lib/safeAnimated';
import { prefersReducedMotion } from '../lib/reduceMotion';

// The website's favourite hop (bug-heart-hop): whatever is inside shrinks, springs past
// full size and settles, each time `active` turns true.
export default function HopOnTrue({ active, children, style }) {
  const hop = useRef(Animated?.Value ? new Animated.Value(1) : null).current;
  const was = useRef(Boolean(active));
  useEffect(() => {
    const turnedOn = Boolean(active) && !was.current;
    was.current = Boolean(active);
    if (!turnedOn || !hop || prefersReducedMotion()) return;
    hop.setValue(0);
    Animated.timing(hop, { toValue: 1, duration: 440, useNativeDriver: true }).start();
  }, [active, hop]);
  if (!hop) return <View style={style}>{children}</View>;
  return <Animated.View style={[style, { transform: [{ scale: hop.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.6, 1.32, 1] }) }] }]}>{children}</Animated.View>;
}
