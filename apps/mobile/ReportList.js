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

import { getDistanceMiles, useReports } from './lib/reports';
import LoadingBee from './components/LoadingBee';
import BrandBug from './components/BrandBug';
import { colors, fonts } from './lib/theme';

export function ReportListItem({ report, origin, onPress, selected = false }) {
  const distance = getDistanceMiles(origin, report);
  const { favoriteIds, toggleFavorite, favoritesReady, hiddenIds, toggleHidden, getReportPhotoUrl } = useReports();
  const isFavorite = favoriteIds.includes(report.id);
  const actions = [
    ...(favoritesReady ? [{ text: hiddenIds.includes(report.id) ? 'Restore report' : 'Hide report', icon: 'eye-off-outline', onPress: () => toggleHidden(report.id) }] : []),
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
        <LoadingBee label="Loading nearby reports" message="Finding cleanups around you…" />
      ) : (
        <View style={styles.emptyState}>
          {/* Website empty state: the ladybug, a heading and one purple action. */}
          <BrandBug kind="ladybug" size={44} />
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
          {emptyAction ? <TouchableOpacity accessibilityRole="button" onPress={emptyAction.onPress} style={styles.emptyAction}><Text style={styles.emptyActionText}>{emptyAction.label}</Text></TouchableOpacity> : null}
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
  // Website card: white, thin lilac line and a soft 3-point drop edge.
  rowShadow: {
    marginVertical: 9,
    marginHorizontal: 16,
    borderRadius: 18,
    backgroundColor: colors.white,
    shadowColor: '#EEEAF8',
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  row: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  completedRow: {},
  selectedRow: { borderColor: colors.primary },
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
  emptyTitle: { marginTop: 14, color: colors.ink, fontSize: 20, fontFamily: fonts.heading, textAlign: 'center' },
  emptyAction: { minHeight: 48, marginTop: 18, paddingHorizontal: 22, justifyContent: 'center', borderRadius: 14, backgroundColor: colors.primary },
  emptyActionText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  emptyText: {
    marginTop: 7,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
});
