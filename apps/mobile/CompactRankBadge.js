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

  if (!ranking) return null;

  const rankDefinition = getRankForPoints(ranking.points);

  return (
    <View
      style={[styles.badge, appearance === 'plain' && styles.plainBadge, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${ranking.rank} community rank`}
    >
      <View style={[styles.artworkStage, appearance === 'plain' && styles.plainArtworkStage]}>
        <Image
          source={getRankAsset(rankDefinition)}
          contentFit="contain"
          style={[styles.artwork, appearance === 'plain' && styles.plainArtwork]}
          accessible={false}
        />
      </View>
      <Text style={[styles.name, appearance === 'plain' && styles.plainName]}>{ranking.rank}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  plainBadge: { marginTop: 0, paddingRight: 0, minHeight: 22, backgroundColor: 'transparent' },
  plainArtworkStage: { width: 20, height: 22, marginRight: 5, backgroundColor: 'transparent' },
  plainArtwork: { width: 20, height: 20 },
  plainName: { fontSize: 12, fontWeight: '500', color: '#68756D' },
  badge: { minHeight: 25, marginTop: 4, paddingRight: 9, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 13, backgroundColor: '#F1F4F2' },
  artworkStage: { width: 25, height: 25, marginRight: 6, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 8, backgroundColor: '#FFFFFF' },
  artwork: { width: 23, height: 23 },
  name: { color: '#52615A', fontSize: 12, lineHeight: 16, fontWeight: '900' },
});
