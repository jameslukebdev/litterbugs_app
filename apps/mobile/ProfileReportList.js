import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from './components/ui';
import { colors } from './lib/theme';

// Website member page rows: a title, then a severity dot with plain words. No thumbnail.
const SEVERITY_DOT = { low: colors.severityLow, medium: colors.severityMedium, high: colors.severityHigh };
const severityLabel = (severity) => {
  const value = String(severity || '').toLowerCase();
  return SEVERITY_DOT[value] ? value.charAt(0).toUpperCase() + value.slice(1) : null;
};

export default function ProfileReportList({ reports, onReportPress, emptyTitle = "No active reports", emptyText = "Active reports will appear here." }) {
  if (!reports?.length) {
    return <EmptyState bug="ladybug" title={emptyTitle} text={emptyText} />;
  }

  return reports.map((report, index) => (
    <TouchableOpacity
      key={report.id}
      style={[styles.row, index > 0 && styles.divider]}
      onPress={() => onReportPress?.(report)}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityLabel={`Open ${report.title || 'litter report'}`}
    >
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={2}>{report.title || 'Litter Report'}</Text>
        <View style={styles.meta}>
          {severityLabel(report.severity) ? (
            <>
              <View style={[styles.severityDot, { backgroundColor: SEVERITY_DOT[String(report.severity).toLowerCase()] }]} />
              <Text style={styles.severity}>{severityLabel(report.severity)}</Text>
            </>
          ) : null}
          {report.created_at ? (
            <Text style={styles.date}>{new Date(report.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
    </TouchableOpacity>
  ));
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    paddingHorizontal: 20,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  copy: { flex: 1, marginRight: 8 },
  title: { color: colors.ink, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  meta: { marginTop: 5, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  severityDot: { width: 8, height: 8, borderRadius: 4 },
  severity: { marginRight: 6, color: colors.body, fontSize: 13, fontWeight: '600' },
  date: { color: colors.muted, fontSize: 13 },
});
