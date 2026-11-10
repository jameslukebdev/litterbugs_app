import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from 'react-native';
import BrandBug from './BrandBug';
import { colors } from '../lib/theme';

// The website's list loading state (apps/web report-controls .loadingBee): the bee fades in
// after a short pause, so quick loads never flash a loader. A gentle bob keeps it alive
// while waiting; both are skipped when the person prefers reduced motion.
export default function LoadingBee({ label = 'Loading', message = null, size = 64, style }) {
  const appear = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let loop = null;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled?.().then((reduce) => {
      if (cancelled) return;
      if (reduce) { appear.setValue(1); return; }
      Animated.timing(appear, { toValue: 1, duration: 180, delay: 350, useNativeDriver: true }).start();
      loop = Animated.loop(Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]));
      loop.start();
    }).catch(() => appear.setValue(1));
    return () => { cancelled = true; loop?.stop(); };
  }, [appear, bob]);

  return (
    <View style={[styles.wrap, style]} accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityLiveRegion="polite">
      <Animated.View style={{ opacity: appear, transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }] }}>
        <BrandBug kind="bee" size={size} />
      </Animated.View>
      {message ? <Animated.Text style={[styles.message, { opacity: appear }]}>{message}</Animated.Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  message: { color: colors.muted, fontSize: 14, textAlign: 'center' },
});
