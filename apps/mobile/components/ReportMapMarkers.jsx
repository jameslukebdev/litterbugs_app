import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { cleanupMapTone } from '../lib/cleanupEligibility';
import { reportsNearMapTap, STATUS_MARKER_SIZE, STATUS_MARKER_ICON_SIZE } from '../lib/mapLabelLayout';

export default function ReportMapMarkers({ markers, selectedId, tracksViewChanges, reportPlacementActive, onNearby, onChoose }) {
  return <>
        {markers.map((m) => {
          const selected = m.id === selectedId;
          const tone = cleanupMapTone(m.report);
          const statusMarker = tone === 'completed' || tone === 'active';
          const icon = tone === 'completed' ? 'checkmark' : tone === 'active' ? 'time-outline' : 'leaf-outline';
          return <Marker key={m.id} coordinate={m.coordinate}
            identifier={`report:${tone}:${m.id}`}
            tracksViewChanges={tracksViewChanges}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={selected ? 1000 : m.labelled ? 10 : 1}
            accessibilityLabel={`${m.label || 'Volunteer cleanup'}, ${tone}: ${m.report?.title || 'Litter report'}`}
            onPress={(event) => {
              event?.stopPropagation?.();
              if (reportPlacementActive) return;
              const nearby = reportsNearMapTap(markers, m.id);
              if (nearby.length > 1) onNearby(nearby.map((item) => item.id))
              else onChoose(m.report);
            }}>
            <View style={[styles.compactMarkerHit, { width: Math.max(44, m.labelled ? m.width : 44), height: Math.max(44, m.labelled ? m.height : 44) }]}>
              {m.label && (m.labelled || selected) ? (
                <View style={[styles.compactMarker, selected && styles.compactMarkerSelected, { minHeight: m.height || 32, width: m.width || 48 }]}>
                  {statusMarker ? <Ionicons name={icon} size={STATUS_MARKER_ICON_SIZE} color={selected ? '#FFFFFF' : '#285D38'} /> : null}
                  <Text numberOfLines={1} style={[styles.compactMarkerText, selected && { color: '#FFFFFF' }]}>{m.label}</Text>
                </View>
              ) : statusMarker || m.labelled || selected ? (
                <View style={[styles.compactStatusMarker, selected && styles.compactMarkerSelected]}>
                  <Ionicons name={icon} size={STATUS_MARKER_ICON_SIZE} color={selected ? '#FFFFFF' : '#285D38'} />
                </View>
              ) : <View style={styles.compactMarkerDot} />}

            </View>
          </Marker>;
        })}
  </>;
}
const styles = StyleSheet.create({
compactMarkerHit: { alignItems: 'center', justifyContent: 'center' },
compactMarker: { flexDirection: 'row', gap: 4, paddingHorizontal: 12, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#92A998', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
compactMarkerSelected: { backgroundColor: '#285D38', borderColor: '#FFFFFF' },
compactMarkerText: { color: '#285D38', fontSize: 14, fontWeight: '700' },
compactStatusMarker: { width: STATUS_MARKER_SIZE, height: STATUS_MARKER_SIZE, borderRadius: STATUS_MARKER_SIZE / 2, backgroundColor: '#FFFFFF', borderColor: '#92A998', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
compactMarkerDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFFFFF', borderColor: '#285D38', borderWidth: 2 },
});
