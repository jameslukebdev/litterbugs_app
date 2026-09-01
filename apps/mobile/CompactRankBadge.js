import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { getRankAsset } from './lib/rankAssets';
import { getRankForPoints } from './lib/ranking';
import { loadRanking } from './lib/rankingService';

export default function CompactRankBadge({ userId, style }) {
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
      style={[styles.badge, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${ranking.rank} community rank`}
    >
      <View style={styles.artworkStage}>
        <Image
          source={getRankAsset(rankDefinition)}
          contentFit="contain"
          style={styles.artwork}
          accessible={false}
        />
      </View>
      <Text style={styles.name}>{ranking.rank}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { minHeight: 25, marginTop: 4, paddingRight: 9, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 13, backgroundColor: '#F3E2F6' },
  artworkStage: { width: 25, height: 25, marginRight: 6, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 8, backgroundColor: '#000000' },
  artwork: { width: 23, height: 23 },
  name: { color: '#75258A', fontSize: 12, lineHeight: 16, fontWeight: '900' },
});
