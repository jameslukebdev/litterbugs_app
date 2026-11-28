import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';

import BrandBug from './BrandBug';
import LoadingBee from './LoadingBee';
import { LoadFailure } from './ui';
import { getRankAsset } from '../lib/rankAssets';
import { getRankForPoints, RANKS } from '../lib/ranking';
import { colors, fonts } from '../lib/theme';

// The website's rank block (apps/web components/community-rank.tsx), shared by a
// member's own Profile and other members' profiles.

// The bar fills from empty when the rank arrives, with the cocoon on its leading
// edge; with reduced motion it simply shows the result.
function RankProgressBar({ percent, label }) {
  const fill = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(0);
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) fill.setValue(percent);
        else Animated.timing(fill, { toValue: percent, duration: 1500, delay: 250, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: false }).start();
      })
      .catch(() => fill.setValue(percent));
    return () => { cancelled = true; };
  }, [fill, percent]);
  const filled = fill.interpolate({ inputRange: [0, 100], outputRange: [0, trackWidth], extrapolate: 'clamp' });

  return (
    <View
      style={styles.rankProgressTrack}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      <Animated.View style={[styles.rankProgressFill, { width: filled }]} />
      <Animated.View style={[styles.rankProgressMarker, { transform: [{ translateX: filled }] }]} pointerEvents="none">
        <BrandBug kind="cocoon" size={30} />
      </Animated.View>
    </View>
  );
}

export default function RankCard({ ranking, loading, error, onRetry, own = true }) {
  if (!ranking) {
    // One quiet loader, or one failure with a retry, while the rank is unknown.
    return (
      <View style={styles.rankCard}>
        {loading || !error
          ? <LoadingBee label="Loading rank" size={48} style={styles.rankPending} />
          : <LoadFailure title={own ? 'Couldn’t load your rank' : 'Couldn’t load this rank'} onRetry={onRetry} style={styles.rankPending} />}
      </View>
    );
  }

  const rankDefinition = getRankForPoints(ranking.points);
  const pointsLabel = `${ranking.points.toLocaleString()} ${ranking.points === 1 ? 'point' : 'points'}`;
  const remainingLabel = `${ranking.pointsRemaining.toLocaleString()} ${ranking.pointsRemaining === 1 ? 'point' : 'points'}`;
  const progressPercent = Math.round(ranking.progress * 100);
  const nextRankDefinition = RANKS.find(({ name }) => name === ranking.nextRank);

  return (
    <View style={styles.rankCard}>
      <View style={styles.rankSummaryRow}>
        <View style={styles.rankArtworkStage}>
          <Image
            source={getRankAsset(rankDefinition)}
            contentFit="contain"
            style={styles.rankArtwork}
            accessibilityLabel={`${ranking.rank} rank artwork`}
          />
        </View>
        <View style={styles.rankSummaryCopy}>
          <Text style={styles.rankName}>{ranking.rank}</Text>
          <Text style={styles.rankEyebrow}>{own ? 'Your rank · ' : ''}{pointsLabel}</Text>
        </View>
      </View>

      {/* Website rank: the bar fills while the cocoon rides its leading edge, then
          the points still to go sit beside the next rank's bug. */}
      <View style={styles.rankProgressSection}>
        <RankProgressBar percent={ranking.nextRank ? progressPercent : 100} label={ranking.nextRank ? `Progress to ${ranking.nextRank}` : 'Highest rank reached'} />
        {ranking.nextRank ? (
          <View style={styles.rankNextRow}>
            <Image source={getRankAsset(nextRankDefinition)} contentFit="contain" style={styles.rankNextArtwork} accessible={false} />
            <Text style={styles.rankNextText}>
              <Text style={styles.rankNextPoints}>{remainingLabel}</Text> to {ranking.nextRank}
            </Text>
          </View>
        ) : (
          <Text style={styles.rankNextText}>Highest rank reached</Text>
        )}
      </View>

      {error ? (
        <TouchableOpacity onPress={onRetry} activeOpacity={0.72} accessibilityRole="button">
          <Text style={styles.rankRefreshWarning}>Couldn’t refresh rank · Tap to retry</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rankArtwork: { width: '100%', height: '100%' },
  rankArtworkStage: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  rankCard: { paddingBottom: 14 },
  rankEyebrow: { marginTop: 2, color: colors.muted, fontSize: 14, lineHeight: 19, fontWeight: '600' },
  rankName: { color: colors.ink, fontSize: 22, lineHeight: 27, fontFamily: fonts.heading },
  rankNextArtwork: { width: 20, height: 20 },
  rankNextPoints: { color: colors.ink, fontWeight: '700' },
  rankNextRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  rankNextText: { marginTop: 0, color: colors.body, fontSize: 14, lineHeight: 20 },
  rankPending: { minHeight: 150, padding: 0, backgroundColor: 'transparent' },
  rankProgressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 10, backgroundColor: colors.primary },
  rankProgressMarker: { position: 'absolute', left: -15, top: -13 },
  rankProgressSection: { width: '100%', marginTop: 20 },
  rankProgressTrack: { height: 10, borderRadius: 10, backgroundColor: colors.edge },
  rankRefreshWarning: { marginTop: 15, color: colors.body, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  rankSummaryCopy: { flex: 1, minWidth: 100 },
  rankSummaryRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14 },
});
