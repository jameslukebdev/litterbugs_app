import { View, Text, StyleSheet, Platform } from 'react-native';
import { Marker } from 'react-native-maps';
import AndroidReportMarker from './AndroidReportMarker';
import { Ionicons } from '@expo/vector-icons';
import { cleanupMapTone } from '../lib/cleanupEligibility';
import { reportsNearMapTap, STATUS_MARKER_SIZE, STATUS_MARKER_ICON_SIZE, SELECTED_MARKER_SCALE, markerHostDimensions } from '../lib/mapLabelLayout';

export default function ReportMapMarkers({ markers, selectedId, tracksViewChanges, reportPlacementActive, onNearby, onChoose }) {
  return <>
        {/* Label allocation changes priority on selection; native annotation order
            must stay stable or MapKit can remove a moved annotation. */}
        {[...markers].sort((a, b) => String(a.id).localeCompare(String(b.id))).map((m) => {
          // MapKit adds 999 to its tapped annotation. App selection must also
          // win when the overlap chooser selects a different report.
          const selected = m.id === selectedId;
          const tone = cleanupMapTone(m.report);
          const statusMarker = tone === 'completed' || tone === 'active';
          const icon = tone === 'completed' ? 'checkmark' : tone === 'active' ? 'time-outline' : 'ellipse-outline';
          const accessibilityLabel = `${m.label || '$0'}, ${tone}: ${m.report?.title || 'Litter report'}`;
          // Android's native content description is a creation-only option.
          // Replace only when spoken report information changes, never on pan,
          // zoom, selection, or label allocation. Preserve MapKit identity.
          const markerKey = Platform?.OS === 'android' ? `${m.id}:${accessibilityLabel}` : m.id;
          const MarkerComponent = Platform?.OS === 'android' ? AndroidReportMarker : Marker;
          return <MarkerComponent key={markerKey} coordinate={m.coordinate}
            {...(Platform?.OS === 'android' ? { snapshotKey: `${m.label}:${m.labelled}:${selected}:${tone}:${m.width}:${m.height}:${m.fontSize}` } : {})}
            style={Platform?.OS === 'android' ? markerHostDimensions(m.width || 44, m.height || 44) : undefined}
            identifier={`report:${tone}:${m.id}`}
            tracksViewChanges={tracksViewChanges}
            anchor={{ x: 0.5, y: 0.5 }}
            {...(Platform?.OS === 'ios'
              ? { annotationZIndex: selected ? 2000 : m.labelled ? 10 : 1 }
              : { zIndex: selected ? 2000 : m.labelled ? 10 : 1 })}
            accessibilityLabel={accessibilityLabel}
            onPress={(event) => {
              event?.stopPropagation?.();
              if (reportPlacementActive) return;
              const nearby = reportsNearMapTap(markers, m.id, Platform?.OS === 'ios' ? event?.nativeEvent?.position : undefined);
              if (nearby.length > 1) onNearby(nearby.map((item) => item.id))
              else onChoose(nearby[0]?.report || m.report);
            }}>
            {/* Text uses the same system fontScale as the measured bounds, avoiding
                a second native font-metrics scale. Reserve bounds even when collapsed. Resizing the
                annotation's host frame can reset its MapKit position in Fabric. */}
            <View collapsable={false} style={[styles.compactMarkerHit, markerHostDimensions(m.width || 44, m.height || 44)]}>
              {m.label && (m.labelled || selected) ? (
                <View style={[styles.compactMarker, selected && styles.compactMarkerSelected, { minHeight: m.height || 24, width: m.width || 34 }]}>
                  {statusMarker ? <Ionicons name={icon} size={STATUS_MARKER_ICON_SIZE} color={selected ? '#FFFFFF' : '#285D38'} /> : null}
                  <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[styles.compactMarkerText, { fontSize: m.fontSize || 13 }, selected && { color: '#FFFFFF' }]}>{m.label}</Text>
                </View>
              ) : statusMarker || m.labelled || selected ? (
                <View style={[styles.compactStatusMarker, selected && styles.compactMarkerSelected]}>
                  <Ionicons name={icon} size={STATUS_MARKER_ICON_SIZE} color={selected ? '#FFFFFF' : '#285D38'} />
                </View>
              ) : <View style={styles.compactMarkerDot} />}

            </View>
          </MarkerComponent>;
        })}
  </>;
}
const styles = StyleSheet.create({
compactMarkerHit: { alignItems: 'center', justifyContent: 'center' },
compactMarker: { flexDirection: 'row', gap: 3, paddingHorizontal: 6, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#92A998', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
compactMarkerSelected: { backgroundColor: '#285D38', borderColor: '#FFFFFF', transform: [{ scale: SELECTED_MARKER_SCALE }] },
compactMarkerText: { color: '#285D38', fontSize: 13, fontWeight: '700' },
compactStatusMarker: { width: STATUS_MARKER_SIZE, height: STATUS_MARKER_SIZE, borderRadius: STATUS_MARKER_SIZE / 2, backgroundColor: '#FFFFFF', borderColor: '#92A998', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
compactMarkerDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF', borderColor: '#285D38', borderWidth: 2 },
});
