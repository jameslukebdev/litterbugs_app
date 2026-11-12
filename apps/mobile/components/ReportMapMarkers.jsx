import { View, StyleSheet, Platform } from 'react-native';
import { Marker } from 'react-native-maps';
import AndroidReportMarker from './AndroidReportMarker';
import MapPin, { pinKind } from './MapPin';
import { cleanupMapTone } from '../lib/cleanupEligibility';
import { reportsNearMapTap, markerHostDimensions } from '../lib/mapLabelLayout';

export default function ReportMapMarkers({ markers, selectedId, tracksViewChanges, reportPlacementActive, onNearby, onChoose, postedId = null }) {
  // Pins animate in on iPhone only: Android draws each marker from a still snapshot,
  // which would capture the pin mid-air.
  const animate = Platform?.OS === 'ios';
  return <>
        {/* Label allocation changes priority on selection; native annotation order
            must stay stable or MapKit can remove a moved annotation. */}
        {[...markers].sort((a, b) => String(a.id).localeCompare(String(b.id))).map((m, order) => {
          // MapKit adds 999 to its tapped annotation. App selection must also
          // win when the overlap chooser selects a different report.
          const selected = m.id === selectedId;
          const tone = cleanupMapTone(m.report);
          const kind = pinKind(m.report?.cleanup_state);
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
            anchor={{ x: 0.5, y: 1 }}
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
              {/* Website pins: the bug alone, plus the amount only when money is on an open report. */}
              <MapPin kind={kind} text={kind === 'open' && m.label && m.label !== '$0' && (m.labelled || selected) ? m.label : null} selected={selected} entrance={animate ? (m.id === postedId ? 'posted' : 'land') : null} order={order} />
            </View>
          </MarkerComponent>;
        })}
  </>;
}
const styles = StyleSheet.create({
compactMarkerHit: { alignItems: 'center', justifyContent: 'flex-end' },
});
