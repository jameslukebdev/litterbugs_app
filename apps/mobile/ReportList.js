import ReportCardDetails from './components/ReportCardDetails';
import ReportCardMenu from './components/ReportCardMenu';
import { isReportShareable, shareReportWithSystemSheet } from './lib/reportSharing';
import RemotePhoto from './components/RemotePhoto';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Alert,
  Platform,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getDistanceMiles, useReports } from './lib/reports';
import BrandedLoadingState from './BrandedLoadingState';

const SEVERITY = Object.freeze({
  high: { color: '#E53935', icon: 'warning' },
  medium: { color: '#F57C00', icon: 'warning' },
  low: { color: '#687178', icon: 'information-circle-outline' },
});

function getSeverity(report) {
  const key = String(report?.severity ?? 'medium').toLowerCase();
  const style = SEVERITY[key] ?? SEVERITY.medium;
  const label = key.charAt(0).toUpperCase() + key.slice(1);

  return { ...style, label };
}

function ReportPhotos({ report, onPress, severity, completed }) {
  const { getReportPhotoUrl, favoriteIds, toggleFavorite, favoritesReady } = useReports();
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const paths = (report?.photo_paths || []).filter(Boolean);
  const photoKey = JSON.stringify(paths);
  useEffect(() => setIndex(0), [report?.id, photoKey, width]);
  return (
    <View style={styles.thumbnail} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 ? (
        <ScrollView
          key={`${report?.id}:${photoKey}:${width}`}
          horizontal
          pagingEnabled
          directionalLockEnabled
          scrollEnabled={paths.length > 1}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={event => setIndex(Math.max(0, Math.min(paths.length - 1, Math.round(event.nativeEvent.contentOffset.x / width))))}
        >
          {(paths.length ? paths : [null]).map((path, i) => (
            <TouchableOpacity
              key={`${path || 'empty'}:${i}`}
              onPress={() => onPress?.(report)}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={`Photo ${i + 1} of ${Math.max(paths.length, 1)} for ${report?.title || 'litter report'}`}
              accessibilityHint="Opens report details"
            >
              <RemotePhoto path={path} getUrl={getReportPhotoUrl} label={`Photo for ${report?.title || 'litter report'}`} style={{ width, height: 160 }} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}
        <View pointerEvents="none" style={styles.severityOverlay}>
          <Ionicons
            name={completed ? 'checkmark-circle' : severity.icon}
            size={15}
            color={completed ? '#2F7D32' : severity.color}
          />
          <Text
            style={[
              styles.severityText,
              { color: completed ? '#2F7D32' : severity.color },
            ]}
          >
            {completed ? 'Cleanup complete' : `${severity.label} severity`}
          </Text>
        </View>
      <TouchableOpacity style={styles.favorite} accessibilityRole="button" accessibilityLabel={favoriteIds.includes(report.id) ? 'Remove from favorites' : 'Add to favorites'} accessibilityState={{ selected: favoriteIds.includes(report.id), disabled: !favoritesReady }} disabled={!favoritesReady} onPress={() => toggleFavorite(report.id)}>
        <Ionicons name={favoriteIds.includes(report.id) ? 'heart' : 'heart-outline'} size={26} color="#FFFFFF" style={styles.heart} />
      </TouchableOpacity>
      {paths.length > 1 ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={styles.photoDots}>{paths.map((path, i) => <View key={`${path}:${i}`} style={[styles.photoDot, i === index && styles.photoDotActive]} />)}</View>
        <View style={styles.photoCounter}>
          <Text style={styles.photoCounterText}>{index + 1} / {paths.length}</Text>
        </View>
        </View>
      ) : null}
    </View>
  );
}

export function ReportListItem({ report, origin, onPress, selected = false }) {
  const severity = getSeverity(report);
  const completed = report?.cleanup_state === 'completed';
  const distance = getDistanceMiles(origin, report);
  const { favoriteIds, toggleFavorite, favoritesReady } = useReports();
  const isFavorite = favoriteIds.includes(report.id);
  const actions = [
    ...(isReportShareable(report) ? [{ text: 'Share report', icon: 'share-outline', onPress: async () => {
      try { await shareReportWithSystemSheet({ report, platform: Platform.OS, share: Share.share }); }
      catch { Alert.alert('Sharing unavailable', 'We couldn’t open the share menu. Please try again.'); }
    } }] : []),
    ...(favoritesReady ? [{ text: isFavorite ? 'Remove favorite' : 'Add to favorites', icon: isFavorite ? 'heart' : 'heart-outline', onPress: () => toggleFavorite(report.id) }] : []),
  ];

  return (
    <View
      style={[styles.row, selected && { backgroundColor: '#F0F7F1', borderColor: '#2F7D32' }]}
    >
      <ReportPhotos report={report} onPress={onPress} severity={severity} completed={completed} />

      <ReportCardDetails report={report} distance={distance} onPress={onPress} selected={selected} options={<ReportCardMenu actions={actions} />} />
    </View>
  );
}

export default function ReportList({
  reports,
  selectedId,
  origin,
  onReportPress,
  contentContainerStyle,
  emptyAction,
  emptyTitle = 'No reports nearby',
  emptyMessage = 'No active reports are visible in this area.',
  refreshing = false,
  initialLoading = false,
  onRefresh,
  scrollEnabled = true,
  style,
}) {
  const listRef = useRef(null);
  const lastSelected = useRef(null);
  useEffect(() => {
    if (!selectedId) { lastSelected.current = null; return; }
    const index = (reports || []).findIndex(report => report.id === selectedId);
    if (index < 0 || lastSelected.current === selectedId) return;
    lastSelected.current = selectedId;
    listRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0.3 });
  }, [selectedId, reports]);
  const data = useMemo(() => reports ?? [], [reports]);

  return (
    <FlatList
      ref={listRef}
      extraData={selectedId}
      onScrollToIndexFailed={({ averageItemLength, index }) => {
        listRef.current?.scrollToOffset({ offset: averageItemLength * index, animated: false });
      }}
      data={data}
      keyExtractor={(report) => String(report.id)}
      renderItem={({ item }) => (
        <ReportListItem report={item} origin={origin} onPress={onReportPress} selected={item.id === selectedId} />
      )}
      ListEmptyComponent={initialLoading ? (
        <BrandedLoadingState compact title="Loading nearby reports…" message="Finding active cleanups around you." />
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="map-outline"
              size={30}
              color="#647078"
              accessible={false}
              importantForAccessibility="no"
            />
          </View>
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
          {emptyAction ? <TouchableOpacity accessibilityRole="button" onPress={emptyAction.onPress} style={{ minHeight: 48, marginTop: 12, justifyContent: 'center' }}><Text style={{ color: '#2F7D32', fontWeight: '700', fontSize: 16 }}>{emptyAction.label}</Text></TouchableOpacity> : null}
        </View>
      )}
      contentContainerStyle={[
        data.length === 0 && styles.emptyContent,
        contentContainerStyle,
      ]}
      style={style}
      refreshing={refreshing}
      onRefresh={onRefresh}
      scrollEnabled={scrollEnabled}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  row: {
    marginVertical: 10,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E4EAE5',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  thumbnail: {
    width: '100%',
    height: 160,
    backgroundColor: '#E7EAEC',
  },
  favorite: { position: 'absolute', right: 6, top: 4, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  heart: { textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  photoDots: { position: 'absolute', bottom: 15, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  photoDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  photoDotActive: { backgroundColor: '#FFFFFF' },
  photoCounter: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  photoCounterText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  severityOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    maxWidth: '70%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  severityText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  emptyContent: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    minHeight: 250,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 34,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E9EFE9',
  },
  emptyTitle: {
    marginTop: 16,
    color: '#24292D',
    fontSize: 19,
    fontWeight: '800',
  },
  emptyText: {
    marginTop: 7,
    color: '#707980',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
});
