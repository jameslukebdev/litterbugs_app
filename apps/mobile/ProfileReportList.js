import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const severityColor = (severity) => {
  if (String(severity).toLowerCase() === 'high') return '#C62828';
  if (String(severity).toLowerCase() === 'low') return '#2E7D32';
  return '#D66A00';
};

export default function ProfileReportList({ reports, onReportPress }) {
  if (!reports?.length) {
    return (
      <View style={styles.empty}>
        <Ionicons name="map-outline" size={28} color="#6F797F" />
        <Text style={styles.emptyTitle}>No active reports</Text>
        <Text style={styles.emptyText}>Active reports will appear here.</Text>
      </View>
    );
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
        <Text style={[styles.severity, { color: severityColor(report.severity) }]}>
          {report.severity || 'Unrated'} severity
        </Text>
        {report.created_at ? (
          <Text style={styles.date}>{new Date(report.created_at).toLocaleDateString()}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={22} color="#9AA1A8" />
    </TouchableOpacity>
  ));
}

const styles = StyleSheet.create({
  row: {
    minHeight: 82,
    paddingHorizontal: 18,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DDE1E3',
  },
  copy: { flex: 1, marginRight: 8 },
  title: { color: '#202428', fontSize: 16, fontWeight: '800' },
  severity: { marginTop: 5, fontSize: 13, fontWeight: '700' },
  date: { marginTop: 3, color: '#747D84', fontSize: 13 },
  empty: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  emptyTitle: { marginTop: 10, color: '#30363B', fontSize: 16, fontWeight: '800' },
  emptyText: { marginTop: 5, color: '#747D84', fontSize: 14 },
});
