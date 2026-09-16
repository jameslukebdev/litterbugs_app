import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import RemotePhoto from './RemotePhoto';
import { reportPresentation } from '../lib/reportPresentation';

function statusPresentation(report) {
  if (report?.cleanup_state === 'completed') {
    return { label: 'Completed', icon: 'leaf', tone: 'completed' };
  }
  if (['claimed', 'completion_submitted', 'changes_requested'].includes(report?.cleanup_state)) {
    return {
      label: report.cleanup_state === 'completion_submitted' ? 'Awaiting review' : 'In progress',
      icon: 'time',
      tone: 'pending',
    };
  }
  if (report?.cancelled_at || report?.expired_at) {
    return { label: reportPresentation(report).status, icon: 'trash', tone: 'available' };
  }
  return { label: 'Available', icon: 'trash', tone: 'available' };
}

export default function ReportPreviewHero({
  report,
  getPhotoUrl,
  onPress,
  isFavorite,
  onFavorite,
  favoritesReady,
}) {
  const status = statusPresentation(report);
  const pending = status.tone === 'pending';

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
        <RemotePhoto
          path={report?.photo_paths?.[0] ?? null}
          getUrl={getPhotoUrl}
          label={`${report?.title || 'Report'} photo`}
          style={styles.heroPhoto}
        />
      </TouchableOpacity>
      <View
        pointerEvents="none"
        style={[
          styles.badge,
          status.tone === 'completed'
            ? styles.statusCompleted
            : pending ? styles.statusPending : styles.statusAvailable,
        ]}
      >
        <Ionicons name={status.icon} size={13} color={pending ? '#4F3900' : '#FFFFFF'} />
        <Text style={[styles.badgeText, pending && styles.pendingBadgeText]}>{status.label}</Text>
      </View>
      <TouchableOpacity
        style={[styles.favorite, isFavorite && styles.favoriteSelected]}
        accessibilityRole="button"
        accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        accessibilityState={{ selected: Boolean(isFavorite), disabled: !favoritesReady }}
        disabled={!favoritesReady}
        hitSlop={6}
        onPress={() => onFavorite?.(report.id)}
      >
        <Ionicons
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={26}
          color={isFavorite ? '#E13B3B' : '#FFFFFF'}
          style={!isFavorite ? styles.favoriteOutline : undefined}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    height: 160,
    overflow: 'hidden',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#EDF2EE',
  },
  heroPhotoButton: { width: '100%', height: 160 },
  heroPhoto: { width: '100%', height: 160 },
  badge: {
    position: 'absolute',
    left: 12,
    top: 14,
    maxWidth: '70%',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusAvailable: { backgroundColor: '#E13B3B' },
  statusPending: { backgroundColor: '#FFB907' },
  statusCompleted: { backgroundColor: '#2F7D32' },
  badgeText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  pendingBadgeText: { color: '#4F3900' },
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
