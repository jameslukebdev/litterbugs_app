import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { getRankAsset } from './lib/rankAssets';
import { getRankForPoints } from './lib/ranking';
import { loadRanking } from './lib/rankingService';

export default function CompactRankBadge({ userId, style, appearance = 'badge' }) {
  const [ranking, setRanking] = useState(null);

  useEffect(() => {
    let active = true;
    setRanking(null);

    if (!userId) return () => { active = false; };

    loadRanking(userId)
      .then((nextRanking) => {
        if (active) setRanking(nextRanking);
      })
      .catch(() => {
        if (active) setRanking(null);
      });

    return () => { active = false; };
  }, [userId]);

  if (!userId) return null;
  const profileCardAppearance = appearance === 'profileCard';
  if (!ranking) return (
    <View style={[styles.badge, appearance === 'plain' && styles.plainBadge, profileCardAppearance && styles.profileCardBadge, style, { opacity: 0 }]}
      pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.artworkStage, appearance === 'plain' && styles.plainArtworkStage, profileCardAppearance && styles.profileCardArtworkStage]} />
      <Text style={[styles.name, appearance === 'plain' && styles.plainName, profileCardAppearance && styles.profileCardName]}>Community rank</Text>
    </View>
  );

  const rankDefinition = getRankForPoints(ranking.points);

  return (
    <View
      style={[styles.badge, appearance === 'plain' && styles.plainBadge, profileCardAppearance && styles.profileCardBadge, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${ranking.rank} community rank`}
    >
      <View style={[styles.artworkStage, appearance === 'plain' && styles.plainArtworkStage, profileCardAppearance && styles.profileCardArtworkStage]}>
        <Image
          source={getRankAsset(rankDefinition)}
          contentFit="contain"
          style={[styles.artwork, appearance === 'plain' && styles.plainArtwork, profileCardAppearance && styles.profileCardArtwork]}
          accessible={false}
        />
      </View>
      <Text style={[styles.name, appearance === 'plain' && styles.plainName, profileCardAppearance && styles.profileCardName]}>{ranking.rank}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  plainBadge: { marginTop: 0, paddingRight: 0, minHeight: 22, backgroundColor: 'transparent' },
  plainArtworkStage: { width: 20, height: 22, marginRight: 5, backgroundColor: 'transparent' },
  plainArtwork: { width: 20, height: 20 },
  plainName: { fontSize: 12, fontWeight: '500', color: '#68756D' },
  profileCardBadge: { minHeight: 32, marginTop: 3, paddingRight: 11, borderRadius: 16, backgroundColor: '#F7EEFA' },
  profileCardArtworkStage: { width: 32, height: 32, marginRight: 7, borderRadius: 10 },
  profileCardArtwork: { width: 29, height: 29 },
  profileCardName: { color: '#7E2995', fontSize: 14, lineHeight: 18, fontWeight: '900' },
  badge: { minHeight: 25, marginTop: 4, paddingRight: 9, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 13, backgroundColor: '#F1F4F2' },
  artworkStage: { width: 25, height: 25, marginRight: 6, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 8, backgroundColor: '#FFFFFF' },
  artwork: { width: 23, height: 23 },
  name: { color: '#52615A', fontSize: 12, lineHeight: 16, fontWeight: '900' },
});
