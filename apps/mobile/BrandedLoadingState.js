import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function BrandedLoadingState({
  title = 'Loading Litterbugs…',
  message = 'This should only take a moment.',
  compact = false,
}) {
  const pulse = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return undefined;
    }

    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(pulse, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [pulse, reduceMotion]);

  const animatedStyle = reduceMotion ? null : {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }),
    transform: [{
      scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.03] }),
    }],
  };

  return (
    <View
      style={[styles.container, compact && styles.containerCompact]}
      accessibilityRole="progressbar"
      accessibilityLabel={`${title} ${message}`}
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.card, compact && styles.cardCompact]}>
        <Animated.View style={[styles.logoStage, animatedStyle]}>
          <Image
            source={require('./assets/LB_Logo_PNG.png')}
            style={styles.logo}
            resizeMode="contain"
            accessible={false}
          />
        </Animated.View>
        <View style={styles.progressTrack} accessible={false}>
          <Animated.View
            style={[
              styles.progressBar,
              reduceMotion ? styles.progressBarReducedMotion : {
                transform: [
                  { translateX: pulse.interpolate({ inputRange: [0, 1], outputRange: [-52, 52] }) },
                  { scaleX: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] }) },
                ],
              },
            ]}
          >
            <View style={styles.progressDot} />
          </Animated.View>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

export function LoadingButtonContent({ label, color = '#FFFFFF' }) {
  return (
    <View style={styles.buttonContent} accessibilityLabel={label}>
      <ActivityIndicator size="small" color={color} />
      <Text style={[styles.buttonLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F5F6F7',
  },
  containerCompact: {
    minHeight: 280,
    paddingVertical: 28,
  },
  card: {
    width: '100%',
    maxWidth: 370,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderWidth: 1,
    borderColor: '#DCE8DD',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  cardCompact: {
    paddingVertical: 22,
  },
  logoStage: {
    width: 120,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 112, height: 68 },
  progressTrack: {
    width: 180,
    height: 8,
    marginTop: 12,
    overflow: 'hidden',
    borderRadius: 4,
    backgroundColor: '#E1E8E2',
  },
  progressBar: {
    alignSelf: 'center',
    width: 76,
    height: 8,
    alignItems: 'flex-end',
    justifyContent: 'center',
    borderRadius: 4,
    backgroundColor: '#2F7D32',
  },
  progressBarReducedMotion: { width: 98 },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFC42E',
  },
  title: {
    marginTop: 14,
    color: '#202428',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  message: {
    maxWidth: 310,
    marginTop: 7,
    color: '#667078',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  buttonLabel: { fontSize: 15, fontWeight: '900' },
});
