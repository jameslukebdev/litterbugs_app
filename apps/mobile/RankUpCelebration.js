import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { ErrorText, PrimaryButton } from './components/ui';
import { getRankAsset } from './lib/rankAssets';
import { colors, fonts } from './lib/theme';

const PARTICLES = [
  { x: -102, y: -78, color: colors.cleanEdge, size: 11 },
  { x: -112, y: 18, color: colors.fundFill, size: 8 },
  { x: -72, y: 90, color: colors.primary, size: 10 },
  { x: 82, y: -92, color: colors.fundFill, size: 9 },
  { x: 112, y: -8, color: colors.cleanEdge, size: 12 },
  { x: 72, y: 92, color: colors.primary, size: 8 },
  { x: -24, y: -118, color: colors.primaryLight, size: 7 },
  { x: 18, y: 118, color: colors.primaryLight, size: 7 },
];

export default function RankUpCelebration({
  visible,
  previousRank,
  newRank,
  onContinue,
  continuing = false,
  error = null,
}) {
  const { width, height } = useWindowDimensions();
  const [finalStateVisible, setFinalStateVisible] = useState(false);
  const oldOpacity = useRef(new Animated.Value(1)).current;
  const oldScale = useRef(new Animated.Value(1)).current;
  const newOpacity = useRef(new Animated.Value(0)).current;
  const newScale = useRef(new Animated.Value(0.45)).current;
  const glowOpacity = useRef(new Animated.Value(0.15)).current;
  const glowScale = useRef(new Animated.Value(0.82)).current;
  const particleBurst = useRef(new Animated.Value(0)).current;
  const copyOpacity = useRef(new Animated.Value(0)).current;
  const animationRef = useRef(null);
  const completionTimerRef = useRef(null);
  const artworkSize = Math.min(width - 104, height * 0.3, 236);

  const showFinalState = () => {
    animationRef.current?.stop();
    if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
    oldOpacity.setValue(0);
    oldScale.setValue(0.55);
    newOpacity.setValue(1);
    newScale.setValue(1);
    glowOpacity.setValue(0.5);
    glowScale.setValue(1.08);
    particleBurst.setValue(1);
    copyOpacity.setValue(1);
    setFinalStateVisible(true);
  };

  useEffect(() => {
    if (!visible || !previousRank || !newRank) return undefined;

    setFinalStateVisible(false);
    oldOpacity.setValue(1);
    oldScale.setValue(1);
    newOpacity.setValue(0);
    newScale.setValue(0.45);
    glowOpacity.setValue(0.15);
    glowScale.setValue(0.82);
    particleBurst.setValue(0);
    copyOpacity.setValue(0);

    const animation = Animated.parallel([
      Animated.sequence([
        Animated.timing(oldScale, {
          toValue: 1.12,
          duration: 360,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(oldScale, {
          toValue: 0.96,
          duration: 320,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(oldScale, {
          toValue: 1.28,
          duration: 430,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(oldScale, {
          toValue: 0.55,
          duration: 260,
          easing: Easing.in(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(1040),
        Animated.timing(oldOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.68,
          duration: 620,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.28,
          duration: 540,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.5,
          duration: 520,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(glowScale, {
        toValue: 1.08,
        duration: 1750,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(880),
        Animated.timing(particleBurst, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(1220),
        Animated.parallel([
          Animated.timing(newOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.spring(newScale, {
            toValue: 1,
            speed: 9,
            bounciness: 9,
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(1820),
        Animated.timing(copyOpacity, {
          toValue: 1,
          duration: 380,
          useNativeDriver: true,
        }),
      ]),
    ]);

    animationRef.current = animation;
    animation.start();
    completionTimerRef.current = setTimeout(() => {
      setFinalStateVisible(true);
    }, 2180);

    return () => {
      animation.stop();
      if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
    };
  }, [
    copyOpacity,
    glowOpacity,
    glowScale,
    newOpacity,
    newRank?.id,
    newScale,
    oldOpacity,
    oldScale,
    particleBurst,
    previousRank?.id,
    visible,
  ]);

  if (!previousRank || !newRank) return null;

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={showFinalState}
    >
      <View style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          {!finalStateVisible ? (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={showFinalState}
              accessibilityRole="button"
              accessibilityLabel="Skip rank up animation"
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          ) : null}

          <Text style={styles.rankUpTitle}>Rank Up!</Text>

          <View style={[styles.artworkStage, { width: artworkSize, height: artworkSize }]}>
            <Animated.View
              style={[
                styles.glow,
                {
                  width: artworkSize * 0.9,
                  height: artworkSize * 0.9,
                  borderRadius: artworkSize * 0.45,
                  opacity: glowOpacity,
                  transform: [{ scale: glowScale }],
                },
              ]}
            />

            {PARTICLES.map((particle, index) => {
              const opacity = particleBurst.interpolate({
                inputRange: [0, 0.12, 0.78, 1],
                outputRange: [0, 1, 0.9, 0],
              });
              const scale = particleBurst.interpolate({
                inputRange: [0, 0.45, 1],
                outputRange: [0.2, 1.2, 0.6],
              });
              const translateX = particleBurst.interpolate({
                inputRange: [0, 1],
                outputRange: [0, particle.x],
              });
              const translateY = particleBurst.interpolate({
                inputRange: [0, 1],
                outputRange: [0, particle.y],
              });

              return (
                <Animated.View
                  key={`${particle.x}-${particle.y}-${index}`}
                  style={[
                    styles.particle,
                    {
                      width: particle.size,
                      height: particle.size,
                      borderRadius: particle.size / 3,
                      backgroundColor: particle.color,
                      opacity,
                      transform: [{ translateX }, { translateY }, { scale }],
                    },
                  ]}
                />
              );
            })}

            <Animated.View
              style={[
                styles.artworkLayer,
                { opacity: oldOpacity, transform: [{ scale: oldScale }] },
              ]}
            >
              <Image
                source={getRankAsset(previousRank)}
                contentFit="contain"
                style={{ width: artworkSize - 12, height: artworkSize - 12 }}
                accessibilityLabel={`${previousRank.name} rank artwork`}
              />
            </Animated.View>

            <Animated.View
              style={[
                styles.artworkLayer,
                { opacity: newOpacity, transform: [{ scale: newScale }] },
              ]}
            >
              <Image
                source={getRankAsset(newRank)}
                contentFit="contain"
                style={{ width: artworkSize - 12, height: artworkSize - 12 }}
                accessibilityLabel={`${newRank.name} rank artwork`}
              />
            </Animated.View>
          </View>

          <Animated.View
            style={[styles.finalCopy, { opacity: copyOpacity }]}
            pointerEvents={finalStateVisible ? 'auto' : 'none'}
          >
            <Text style={styles.congratulations}>Congratulations!</Text>
            <Text style={styles.reached}>You’ve reached</Text>
            <Text style={styles.newRank}>{newRank.name.toUpperCase()}</Text>
            <Text style={styles.impactCopy}>
              Your reports and cleanup efforts are making a community impact.
            </Text>

            <ErrorText style={styles.error}>{error}</ErrorText>

            <PrimaryButton label="Continue" busy={continuing} busyLabel="Saving…" onPress={onContinue} accessibilityLabel="Continue after rank up" style={styles.continueButton} />
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 18, backgroundColor: 'rgba(41, 41, 50, 0.86)' },
  card: { width: '100%', maxWidth: 430, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 24, alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: colors.line, borderRadius: 28, backgroundColor: colors.white, shadowColor: colors.ink, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.22, shadowRadius: 28, elevation: 15 },
  skipButton: { position: 'absolute', zIndex: 5, top: 12, right: 12, minWidth: 58, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  skipText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  rankUpTitle: { color: colors.ink, fontSize: 29, lineHeight: 35, fontFamily: fonts.heading },
  artworkStage: { marginTop: 17, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 38, backgroundColor: colors.white },
  glow: { position: 'absolute', backgroundColor: colors.primarySoft },
  artworkLayer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  particle: { position: 'absolute', zIndex: 3 },
  finalCopy: { width: '100%', marginTop: 20, alignItems: 'center' },
  congratulations: { color: colors.ink, fontSize: 20, lineHeight: 26, fontFamily: fonts.heading },
  reached: { marginTop: 2, color: colors.body, fontSize: 15, lineHeight: 21 },
  newRank: { marginTop: 3, color: colors.primary, fontSize: 25, lineHeight: 31, fontFamily: fonts.heading, letterSpacing: 1.1, textAlign: 'center' },
  impactCopy: { maxWidth: 310, marginTop: 8, color: colors.body, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  error: { marginTop: 10, textAlign: 'center' },
  continueButton: { width: '100%', marginTop: 18 },
});
