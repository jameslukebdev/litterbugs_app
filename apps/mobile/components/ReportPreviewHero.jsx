import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import BrandBug from './BrandBug';
import HopOnTrue from './HopOnTrue';
import RemotePhoto from './RemotePhoto';
import { reportStatePresentation } from '../lib/reportState';
import { hapticTap } from '../lib/haptics';
import { colors, fonts } from '../lib/theme';

export default function ReportPreviewHero({
  report,
  getPhotoUrl,
  onPress,
  isFavorite,
  onFavorite,
  favoritesReady,
}) {
  const status = reportStatePresentation(report);
  // Website cards: a cleaned report leads with its after photo (the site's public
  // after-photo address), falling back to the report photo when there is none.
  const [afterFailed, setAfterFailed] = useState(false);
  useEffect(() => { setAfterFailed(false); }, [report?.id]);
  const showAfter = report?.cleanup_state === 'completed' && report?.id && !afterFailed;

  return (
    <View style={styles.hero}>
      <TouchableOpacity
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel="View report"
        accessibilityHint="Opens report details"
        onPress={() => onPress?.(report)}
        style={styles.heroPhotoButton}
      >
        {showAfter ? (
          <ExpoImage
            source={`https://litterbugs.app/reports/${encodeURIComponent(report.id)}/photo/after?width=640`}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
            style={styles.heroPhoto}
            onError={() => setAfterFailed(true)}
            accessibilityLabel={`${report?.title || 'Report'} after cleanup`}
          />
        ) : <RemotePhoto
          path={report?.photo_paths?.[0] ?? null}
          getUrl={getPhotoUrl}
          label={`${report?.title || 'Report'} photo`}
          style={styles.heroPhoto}
        />}
      </TouchableOpacity>
      <View pointerEvents="none" style={[styles.badge, status.tone === 'done' && styles.badgeCleaned]}>
        {status.bug ? <BrandBug kind={status.bug} size={14} /> : null}
        {/* Website card label: short words ("Available", "In progress", "Cleaned") with the bug. */}
        <Text style={[styles.badgeText, { color: status.ink }]}>{status.tone === 'open' ? 'Available' : status.tone === 'busy' ? 'In progress' : status.tone === 'done' ? 'Cleaned' : status.label}</Text>
      </View>
      <TouchableOpacity
        style={[styles.favorite, isFavorite && styles.favoriteSelected]}
        accessibilityRole="button"
        accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        accessibilityState={{ selected: Boolean(isFavorite), disabled: !favoritesReady }}
        disabled={!favoritesReady}
        hitSlop={6}
        onPress={() => { hapticTap(); onFavorite?.(report.id); }}
      >
        <HopOnTrue active={Boolean(isFavorite)}>
          <Ionicons
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={26}
            color={isFavorite ? colors.severityHigh : colors.white}
            style={!isFavorite ? styles.favoriteOutline : undefined}
          />
        </HopOnTrue>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    aspectRatio: 1.7,
    overflow: 'hidden',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: colors.mist,
  },
  heroPhotoButton: { width: '100%', height: '100%' },
  heroPhoto: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    left: 10,
    top: 10,
    maxWidth: '70%',
    minHeight: 24,
    paddingLeft: 7,
    paddingRight: 10,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    // Neutral white label over the photo; colour comes from the bug and text.
    backgroundColor: colors.white,
    boxShadow: '0 2px 6px rgba(42, 34, 90, 0.15)',
  },
  // Cleaned-up reports wear the mint fill.
  badgeCleaned: { backgroundColor: colors.doneSoft },
  badgeText: { fontSize: 12, fontFamily: fonts.heading },
  favorite: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteSelected: { borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.94)' },
  favoriteOutline: {
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
