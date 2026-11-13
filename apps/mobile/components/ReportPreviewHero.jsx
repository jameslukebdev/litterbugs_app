import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import SmoothImage from './SmoothImage';
import { Ionicons } from '@expo/vector-icons';

import BrandBug from './BrandBug';
import HopOnTrue from './HopOnTrue';
import RemotePhoto from './RemotePhoto';
import { usePhotoBatchSlot } from './PhotoBatch';
import { reportStatePresentation } from '../lib/reportState';
import { reportAfterPhotoUrl, reportCardPhotoUrl } from '../lib/reportPhotoUrls';
import { hapticTap } from '../lib/haptics';
import { colors, fonts } from '../lib/theme';

export default function ReportPreviewHero({
  report,
  getPhotoUrl,
  onPress,
  isFavorite,
  onFavorite,
  favoritesReady,
  sheet = false,
}) {
  const status = reportStatePresentation(report);
  // Website cards: a cleaned report leads with its after photo. Otherwise the card uses
  // the website's small card copy of the report photo, which loads far faster than the
  // original upload; each falls back to the next, ending at the original photo.
  const photoPath = report?.photo_paths?.[0] ?? null;
  const quickSources = useMemo(() => [
    report?.cleanup_state === 'completed' && reportAfterPhotoUrl(report?.id),
    reportCardPhotoUrl(photoPath),
  ].filter(Boolean), [report?.cleanup_state, report?.id, photoPath]);
  const [fallbacks, setFallbacks] = useState(0);
  useEffect(() => { setFallbacks(0); }, [report?.id, photoPath]);
  const quickSource = quickSources[fallbacks];
  // One slot for the card's photo, kept while a missing after photo falls back to the
  // report photo, so the fallback still appears together with the other cards.
  const photoSlot = usePhotoBatchSlot(true, report?.id);

  return (
    <View style={[styles.hero, sheet && styles.sheetHero]}>
      <TouchableOpacity
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel="View report"
        accessibilityHint="Opens report details"
        onPress={() => onPress?.(report)}
        style={styles.heroPhotoButton}
      >
        {quickSource ? (
          <SmoothImage
            key={quickSource}
            source={quickSource}
            contentFit="cover"
            cachePolicy="memory-disk"
            style={styles.heroPhoto}
            batchSlot={photoSlot}
            onError={() => { photoSlot?.restart(); setFallbacks(value => value + 1); }}
            accessibilityLabel={quickSource.includes('/photo/after') ? `${report?.title || 'Report'} after cleanup` : `${report?.title || 'Report'} photo`}
          />
        ) : <RemotePhoto
          path={photoPath}
          getUrl={getPhotoUrl}
          batchSlot={photoSlot}
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
        style={[styles.favorite, sheet && styles.sheetFavorite, isFavorite && styles.favoriteSelected]}
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
  // A map sheet already owns the rounded top edge and its grabber rail.
  sheetHero: { borderTopLeftRadius: 0, borderTopRightRadius: 0 },
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
  // Leave the sheet's fixed close target clear of the favorite button's hit slop.
  sheetFavorite: { top: 14 },
  favoriteOutline: {
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
