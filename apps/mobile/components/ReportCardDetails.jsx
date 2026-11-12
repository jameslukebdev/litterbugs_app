import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CompactRankBadge from '../CompactRankBadge';
import ProfileAvatar from '../ProfileAvatar';
import BrandBug from './BrandBug';
import { reportPresentation } from '../lib/reportPresentation';
import { colors, fonts } from '../lib/theme';
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

// Website card wording (apps/web components/report-browser.tsx rewardLabel / reportSummary).
const usd = (cents) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
function websiteReward(report) {
  if (report?.cleanup_state === 'completed') {
    const reward = report.completedRewardCents;
    return reward == null ? 'Cleanup completed' : reward > 0 ? `${usd(reward)} funded cleanup` : 'Volunteer cleanup completed';
  }
  return report?.funded_amount_cents > 0 ? `Pays ${usd(report.funded_amount_cents)}` : 'Volunteer cleanup';
}
function websiteSummary(report, distanceText) {
  const types = (Array.isArray(report?.litter_types) ? report.litter_types : []).filter(Boolean);
  const typeSummary = types.length > 2 ? `${types.slice(0, 2).join(' · ')} +${types.length - 2}` : types.join(' · ');
  return [distanceText, typeSummary || report?.types || 'General litter'].filter(Boolean).join(' · ');
}
// Severity is a coloured dot and word, as on the website.
const SEVERITY_DOT = { Low: colors.severityLow, Medium: colors.severityMedium, High: colors.severityHigh };

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
  const presentation = reportPresentation(report);
  const completed = report?.cleanup_state === 'completed';
  const reporter = report.reporter?.display_name?.trim() || (report.reporter?.username ? `@${report.reporter.username}` : 'Reporter unavailable');
  const fundedAmount = Math.max(0, Number(completed ? report.completedRewardCents : report.funded_amount_cents) || 0);
  const funding = completed && report.completedRewardCents == null ? 'Cleanup complete' : fundedAmount < 1
    ? 'Volunteer cleanup'
    : completed
      ? `Funded cleanup ${new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(fundedAmount / 100)}`
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

        {preview ? (
          <>
            {/* Website card: a funded cleanup is gold with the bee; a volunteer one is quiet. */}
            <View style={styles.rewardLine}>
              {fundedAmount > 0 ? <BrandBug kind="bee" size={17} /> : null}
              <Text style={[styles.websiteReward, styles.rewardLineText, fundedAmount > 0 && styles.websiteRewardFunded]}>{websiteReward(report)}</Text>
            </View>
            <Text style={styles.websiteSummary} numberOfLines={1}>{websiteSummary(report, distance == null ? null : `${distance < 10 ? distance.toFixed(1) : Math.round(distance)} mi`)}</Text>
            <View style={styles.websiteMeta}>
              <View style={styles.websiteSeverity}>
                <View style={[styles.severityDot, { backgroundColor: SEVERITY_DOT[normalizedSeverity] || SEVERITY_DOT.Medium }]} />
                <Text style={styles.websiteSeverityText}>{normalizedSeverity}</Text>
              </View>
              {completed ? <Text style={styles.websiteMetaText}>Cleanup complete</Text> : report?.created_at ? <Text style={styles.websiteMetaText}>{new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text> : null}
            </View>
            <View style={styles.websiteReporter}>
              <ProfileAvatar profile={report.reporter} size={36} />
              <View style={styles.previewReporterCopy}>
                <Text style={styles.websiteReporterName} numberOfLines={1}>{reporter}</Text>
                <CompactRankBadge userId={report.reporter?.id} appearance="plain" />
              </View>
              {/* Website card: the ••• menu sits at the end of the reporter row. */}
              <View style={styles.reporterMenuSlot}>{options}</View>
            </View>
          </>
        ) : (
          <>
            {!completed && report.cleanup_state !== 'available' ? <Text style={styles.metadata}>{presentation.status}</Text> : null}
            <View style={styles.rewardMetadataRow}>
              <View style={[styles.rewardLine, { marginTop: 0 }]}>
                {fundedAmount > 0 ? <BrandBug kind="bee" size={17} /> : null}
                <Text style={[styles.websiteReward, styles.rewardLineText, fundedAmount > 0 && styles.websiteRewardFunded]}>{websiteReward(report)}</Text>
              </View>
              {metadata ? <Text style={styles.inlineMetadata}>{metadata}</Text> : null}
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="trash-outline" size={15} color={colors.muted} />
              <Text style={styles.types} numberOfLines={2} ellipsizeMode="tail">{getLitterSummary(report)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={15} color={colors.muted} />
              <Text style={styles.reporter} numberOfLines={1}>By {reporter}</Text>
            </View>
          </>
        )}
      </TouchableOpacity>
      {preview ? null : options}
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
  title: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
  },
  previewTitle: { fontSize: 16, lineHeight: 20.5, fontFamily: fonts.heading, fontWeight: 'normal' },
  websiteReward: { marginTop: 6, color: colors.muted, fontSize: 15, lineHeight: 20, fontFamily: fonts.heading },
  websiteRewardFunded: { color: colors.gold, fontSize: 16 },
  rewardLine: { marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  rewardLineText: { marginTop: 0, flexShrink: 1 },
  websiteSummary: { marginTop: 4, color: colors.muted, fontSize: 13, lineHeight: 18 },
  websiteMeta: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.mist, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  websiteSeverity: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  severityDot: { width: 8, height: 8, borderRadius: 4 },
  websiteSeverityText: { color: colors.body, fontSize: 12, fontWeight: '700' },
  websiteMetaText: { color: colors.muted, fontSize: 12 },
  websiteReporter: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.mist, flexDirection: 'row', alignItems: 'center', gap: 9 },
  reporterMenuSlot: { width: 44, height: 44 },
  websiteReporterName: { color: colors.ink, fontSize: 14, lineHeight: 17 },
  rewardMetadataRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 5,
    marginTop: 5,
  },
  inlineMetadata: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 5 },
  metadata: {
    marginTop: 3,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  types: {
    flex: 1,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  reporter: {
    flex: 1,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  previewReporterCopy: { flex: 1, minWidth: 0 },
});
