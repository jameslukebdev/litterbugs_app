import { StyleSheet, Text, View } from 'react-native';
import BrandBug from './BrandBug';
import { pinKind } from './MapPin';
import { colors } from '../lib/theme';

// The website's map key (apps/web `.map-key`): a live count of the reports in
// view, each line labelled by its pin's bug. States with no reports are left out.
const ROWS = [
  ['open', 'ladybug', 'need a cleanup', 'needs a cleanup'],
  ['busy', 'caterpillar', 'being cleaned', 'being cleaned'],
  ['done', 'flower', 'cleaned up', 'cleaned up'],
];

export function mapKeyCounts(reports, region) {
  const counts = { open: 0, busy: 0, done: 0 };
  const halfLat = (region?.latitudeDelta ?? 0) / 2;
  const halfLng = (region?.longitudeDelta ?? 0) / 2;
  for (const report of reports) {
    const { latitude, longitude } = report.coordinate || {};
    if (region && (Math.abs(latitude - region.latitude) > halfLat || Math.abs(longitude - region.longitude) > halfLng)) continue;
    counts[pinKind(report.report?.cleanup_state)] += 1;
  }
  return counts;
}

export default function MapKey({ counts }) {
  const rows = ROWS.filter(([kind]) => counts[kind] > 0);
  if (!rows.length) return null;
  const spoken = rows.map(([kind, , many, one]) => `${counts[kind]} ${counts[kind] === 1 ? one : many}`).join(', ');
  return (
    <View style={styles.key} pointerEvents="none" accessible accessibilityLabel={`Map key: ${spoken}`}>
      {rows.map(([kind, bug, many, one]) => (
        <View key={kind} style={styles.row}>
          <BrandBug kind={bug} size={14} />
          <Text style={styles.label} allowFontScaling={false}>
            <Text style={styles.count}>{counts[kind]}</Text> {counts[kind] === 1 ? one : many}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  key: {
    alignSelf: 'flex-start',
    marginLeft: 16,
    marginTop: 8,
    gap: 1,
    paddingVertical: 5,
    paddingLeft: 8,
    paddingRight: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECE8F8',
    borderBottomWidth: 3,
    borderBottomColor: '#EBE7F8',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  label: { color: '#3D3A4A', fontSize: 12, fontWeight: '600' },
  count: { color: colors.ink, fontWeight: '800' },
});
