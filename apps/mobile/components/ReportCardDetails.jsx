import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CompactRankBadge from '../CompactRankBadge';
import ProfileAvatar from '../ProfileAvatar';
import { reportPresentation } from '../lib/reportPresentation';
import { getSeveritySelectionColors } from '../lib/severitySelectionColors';
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


export default function ReportCardDetails({ report, distance, onPress, selected = false, options, preview = false }) {
  const severity = { label: String(report?.severity || 'medium') };
  const normalizedSeverity = severity.label.charAt(0).toUpperCase() + severity.label.slice(1).toLowerCase();
  const severityIndex = Math.max(0, ['Low', 'Medium', 'High'].indexOf(normalizedSeverity));
  const severityColors = getSeveritySelectionColors(severityIndex);
  const presentation = reportPresentation(report);
  const completed = report?.cleanup_state === 'completed';
  const reporter = report.reporter?.display_name?.trim() || (report.reporter?.username ? `@${report.reporter.username}` : 'Reporter unavailable');
  const fundedAmount = Math.max(0, Number(report.funded_amount_cents) || 0);
  const funding = fundedAmount < 1
    ? 'Volunteer'
    : completed
      ? `Cleanup fund total ${new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(fundedAmount / 100)}`
      : presentation.funding;

  const relativeTime = getRelativeTime(report?.created_at);
  const metadata = [
    distance == null ? null : `${distance < 10 ? distance.toFixed(1) : Math.round(distance)} mi`,
    relativeTime,
  ].filter(Boolean).join(' · ');
  const accessibilityLabel = [
    report?.title || 'Litter report',
    completed ? 'Cleanup complete' : `${severity.label} severity`,
    funding,
    metadata,
    getLitterSummary(report),
    `Reported by ${reporter}`,
  ].filter(Boolean).join(', ');

  return (
      <View>
      <TouchableOpacity
        style={styles.rowCopy}
        accessibilityState={{ selected }}
        onPress={() => onPress?.(report)}
        activeOpacity={0.72}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Opens report details"
      >


        <Text style={[styles.title, preview && styles.previewTitle]} numberOfLines={2}>
          {report?.title || 'Litter Report'}
        </Text>

        {!preview && !completed && report.cleanup_state !== 'available' ? <Text style={styles.metadata}>{presentation.status}</Text> : null}
        <View style={styles.rewardMetadataRow}>
          <View style={[styles.rewardPill, preview && styles.previewRewardPill]}>
            <Text style={[styles.rewardText, preview && styles.previewRewardText]}>{funding}</Text>
          </View>
          {metadata ? <Text style={styles.inlineMetadata}>{metadata}</Text> : null}
        </View>
        {preview ? (
          <View style={[
            styles.previewSeverity,
            {
              backgroundColor: severityColors.backgroundColor,
              borderColor: severityColors.borderColor,
            },
          ]}>
            <Ionicons
              name={normalizedSeverity === 'High' ? 'warning-outline' : normalizedSeverity === 'Low' ? 'leaf-outline' : 'trash-outline'}
              size={13}
              color={severityColors.foregroundColor}
            />
            <Text style={[styles.previewSeverityText, { color: severityColors.foregroundColor }]}>
              {normalizedSeverity} severity
            </Text>
          </View>
        ) : (
          <View style={styles.detailRow}>
            <Ionicons name="trash-outline" size={15} color="#6C737A" />
            <Text style={styles.types} numberOfLines={2} ellipsizeMode="tail">{getLitterSummary(report)}</Text>
          </View>
        )}
        {preview ? (
          <View style={styles.previewReporterCard}>
            <ProfileAvatar profile={report.reporter} size={34} />
            <View style={styles.previewReporterCopy}>
              <Text style={styles.previewReporterLabel}>Reported by</Text>
              <Text style={styles.previewReporterName} numberOfLines={1}>{reporter}</Text>
            </View>
            <CompactRankBadge userId={report.reporter?.id} />
          </View>
        ) : (
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={15} color="#657169" />
            <Text style={styles.reporter} numberOfLines={1}>By {reporter}</Text>
          </View>
        )}
      </TouchableOpacity>
      {options}
      </View>
  );
}
const styles = StyleSheet.create({
  rowCopy: {
    minWidth: 0,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 12,
  },
  chevron: {
    position: 'absolute',
    right: 10,
    top: 12,
  },
  title: {
    paddingRight: 34,
    color: '#171A1D',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
  },
  previewTitle: { fontSize: 18, lineHeight: 23, fontWeight: '800' },
  rewardPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#E3F1E4',
  },
  rewardText: {
    color: '#4A9F50',
    fontSize: 12,
    fontWeight: '600',
  },
  previewRewardPill: { paddingHorizontal: 10, paddingVertical: 5 },
  previewRewardText: { fontSize: 14, lineHeight: 18, fontWeight: '800' },
  rewardMetadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
    marginTop: 5,
  },
  inlineMetadata: { color: '#6C737A', fontSize: 12, lineHeight: 17 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 5 },
  metadata: {
    marginTop: 3,
    color: '#6C737A',
    fontSize: 13,
    lineHeight: 18,
  },
  types: {
    flex: 1,
    color: '#6C737A',
    fontSize: 13,
    lineHeight: 18,
  },
  reporter: {
    flex: 1,
    color: '#657169',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  previewSeverity: {
    alignSelf: 'flex-start',
    marginTop: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  previewSeverityText: { fontSize: 10, lineHeight: 14, fontWeight: '800' },
  previewReporterCard: {
    marginTop: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDEBDD',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewReporterCopy: { flex: 1, minWidth: 0 },
  previewReporterLabel: { color: '#777F86', fontSize: 10, lineHeight: 13 },
  previewReporterName: { marginTop: 1, color: '#202428', fontSize: 13, lineHeight: 17, fontWeight: '700' },
});
