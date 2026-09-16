import ReportCardDetails from './components/ReportCardDetails';
import ReportCardMenu from './components/ReportCardMenu';
import ReportPreviewHero from './components/ReportPreviewHero';
import { isReportShareable, shareReportWithSystemSheet } from './lib/reportSharing';
import { useEffect, useMemo, useRef } from 'react';
import {
  FlatList,
  Alert,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getDistanceMiles, useReports } from './lib/reports';
import BrandedLoadingState from './BrandedLoadingState';

export function ReportListItem({ report, origin, onPress, selected = false }) {
  const distance = getDistanceMiles(origin, report);
  const { favoriteIds, toggleFavorite, favoritesReady, getReportPhotoUrl } = useReports();
  const isFavorite = favoriteIds.includes(report.id);
  const actions = [
    ...(isReportShareable(report) ? [{ text: 'Share report', icon: 'share-outline', onPress: async () => {
      try { await shareReportWithSystemSheet({ report, platform: Platform.OS, share: Share.share }); }
      catch { Alert.alert('Sharing unavailable', 'We couldn’t open the share menu. Please try again.'); }
    } }] : []),
    ...(favoritesReady ? [{ text: isFavorite ? 'Remove favorite' : 'Add to favorites', icon: isFavorite ? 'heart' : 'heart-outline', onPress: () => toggleFavorite(report.id) }] : []),
  ];

  return (
    <View style={styles.rowShadow}>
      <View
        style={[
          styles.row,
          report?.cleanup_state === 'completed' && styles.completedRow,
          selected && styles.selectedRow,
        ]}
      >
        <ReportPreviewHero
          report={report}
          getPhotoUrl={getReportPhotoUrl}
          onPress={onPress}
          isFavorite={isFavorite}
          onFavorite={toggleFavorite}
          favoritesReady={favoritesReady}
        />

        <ReportCardDetails preview report={report} distance={distance} onPress={onPress} selected={selected} options={<ReportCardMenu actions={actions} />} />
      </View>
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
  rowShadow: {
    marginVertical: 10,
    marginHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#29402D',
    shadowOpacity: 0.1,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  row: {
    borderWidth: 1,
    borderColor: '#DDEBDD',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  completedRow: { backgroundColor: '#F0F7F1', borderColor: '#66BB6A' },
  selectedRow: { borderColor: '#66BB6A' },
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
