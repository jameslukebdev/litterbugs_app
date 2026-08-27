import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';

import { getDistanceMiles, useReports } from './lib/reports';
import { formatUsd } from './lib/funding';

const SEVERITY = Object.freeze({
  high: { color: '#E53935', icon: 'warning' },
  medium: { color: '#F57C00', icon: 'warning' },
  low: { color: '#43A047', icon: 'warning' },
});

function getSeverity(report) {
  const key = String(report?.severity ?? 'medium').toLowerCase();
  const style = SEVERITY[key] ?? SEVERITY.medium;
  const label = key.charAt(0).toUpperCase() + key.slice(1);

  return { ...style, label };
}

function getRelativeTime(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return null;

  const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function getLitterSummary(report) {
  const items = [
    ...(Array.isArray(report?.litter_types) ? report.litter_types : []),
    report?.types,
  ].filter(Boolean);

  return items.length > 0 ? items.join(', ') : 'Litter report';
}

function ReportThumbnail({ report, size }) {
  const { getReportPhotoUrl } = useReports();
  const photoPath = report?.photo_paths?.[0] ?? null;
  const [photoUrl, setPhotoUrl] = useState(null);
  const [loading, setLoading] = useState(Boolean(photoPath));

  useEffect(() => {
    let active = true;

    if (!photoPath) {
      setPhotoUrl(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    getReportPhotoUrl(photoPath).then((url) => {
      if (!active) return;
      setPhotoUrl(url);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [getReportPhotoUrl, photoPath]);

  if (photoUrl) {
    return (
      <ExpoImage
        source={photoUrl}
        contentFit="cover"
        cachePolicy="memory-disk"
        style={[styles.thumbnail, { width: size, height: size * 0.86 }]}
        accessibilityLabel={`Photo for ${report?.title || 'litter report'}`}
      />
    );
  }

  return (
    <View style={[styles.thumbnailPlaceholder, { width: size, height: size * 0.86 }]}>
      {loading ? (
        <ActivityIndicator size="small" color="#2F7D32" />
      ) : (
        <Ionicons name="image-outline" size={30} color="#879098" />
      )}
    </View>
  );
}

export function ReportListItem({ report, origin, onPress }) {
  const { width } = useWindowDimensions();
  const thumbnailSize = Math.min(112, Math.max(94, width * 0.27));
  const severity = getSeverity(report);
  const completed = report?.cleanup_state === 'completed';
  const distance = getDistanceMiles(origin, report);
  const relativeTime = getRelativeTime(report?.created_at);
  const metadata = [
    distance == null ? null : `${distance < 10 ? distance.toFixed(1) : Math.round(distance)} mi`,
    relativeTime,
  ].filter(Boolean).join(' · ');
  const accessibilityLabel = [
    report?.title || 'Litter report',
    completed ? 'Cleanup complete' : `${severity.label} severity`,
    metadata,
    getLitterSummary(report),
    `Reported by ${report?.reporter?.display_name || 'Reporter unavailable'}`,
  ].filter(Boolean).join(', ');

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onPress?.(report)}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Opens report details"
    >
      <ReportThumbnail report={report} size={thumbnailSize} />

      <View style={styles.rowCopy}>
        <View style={styles.severityRow}>
          <Ionicons
            name={completed ? 'checkmark-circle' : severity.icon}
            size={18}
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

        <Text style={styles.title} numberOfLines={2}>
          {report?.title || 'Litter Report'}
        </Text>

        {Number(report?.funded_amount_cents) > 0 ? (
          <View style={styles.rewardPill}>
            <Text style={styles.rewardText}>Cleaner gets {formatUsd(report.funded_amount_cents)}</Text>
          </View>
        ) : null}

        {metadata ? (
          <Text style={styles.metadata} numberOfLines={1}>{metadata}</Text>
        ) : null}

        <Text style={styles.types} numberOfLines={1}>
          {getLitterSummary(report)}
        </Text>
        <Text style={styles.reporter} numberOfLines={1}>
          By {report?.reporter?.display_name || 'Reporter unavailable'}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={25} color="#9AA1A8" />
    </TouchableOpacity>
  );
}

export default function ReportList({
  reports,
  origin,
  onReportPress,
  contentContainerStyle,
  emptyMessage = 'No active reports are visible in this area.',
  refreshing = false,
  onRefresh,
  scrollEnabled = true,
  style,
}) {
  const data = useMemo(() => reports ?? [], [reports]);

  return (
    <FlatList
      data={data}
      keyExtractor={(report) => String(report.id)}
      renderItem={({ item }) => (
        <ReportListItem report={item} origin={origin} onPress={onReportPress} />
      )}
      ItemSeparatorComponent={() => <View style={styles.divider} />}
      ListEmptyComponent={(
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
          <Text style={styles.emptyTitle}>No reports nearby</Text>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
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
    minHeight: 136,
    paddingVertical: 18,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  thumbnail: {
    borderRadius: 14,
    backgroundColor: '#E7EAEC',
  },
  thumbnailPlaceholder: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E9EDE9',
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 14,
    marginRight: 8,
  },
  severityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  severityText: {
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    marginTop: 6,
    color: '#171A1D',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
  },
  rewardPill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#E3F1E4',
  },
  rewardText: {
    color: '#245F2A',
    fontSize: 12,
    fontWeight: '900',
  },
  metadata: {
    marginTop: 5,
    color: '#6C737A',
    fontSize: 14,
    lineHeight: 19,
  },
  types: {
    marginTop: 4,
    color: '#7A8187',
    fontSize: 14,
    lineHeight: 19,
  },
  reporter: {
    marginTop: 3,
    color: '#657169',
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 18,
    backgroundColor: '#DDE1E3',
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
