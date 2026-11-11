import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';

// Bottom sheets open with the modal fading in (so the dimmed backdrop fades rather than
// sliding up with the sheet) while the sheet itself rises a short way. Pass the modal's
// own `visible` value as `open` and the sheet also sinks back down while the modal fades
// out. Reduced motion skips both movements.
export default function SlideUp({ style, children, distance = 48, open = true, ...props }) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) progress.setValue(1);
        else if (open) Animated.spring(progress, { toValue: 1, damping: 22, stiffness: 240, mass: 0.9, useNativeDriver: true }).start();
        else Animated.timing(progress, { toValue: 0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }).start();
      })
      .catch(() => progress.setValue(1));
    return () => { cancelled = true; };
  }, [open, progress]);
  return (
    <Animated.View
      {...props}
      style={[style, { transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] }]}
    >
      {children}
    </Animated.View>
  );
}
