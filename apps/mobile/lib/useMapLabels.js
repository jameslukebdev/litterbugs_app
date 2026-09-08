import { useEffect, useMemo, useState } from 'react';
import { layoutMapLabels, mapMarkerDimensions } from './mapLabelLayout';
import { cleanupMapTone } from './cleanupEligibility';
import { formatMapFundingLabel, isFundedMapMarker } from './mapFundingMarker';

export default function useMapLabels({ markers, mapRef, ready, region, revision, size, selectedId, fontScale }) {
  const [positions, setPositions] = useState([]);
  useEffect(() => {
    let active = true;
    if (!ready || !mapRef.current) return undefined;
    // Native projection accounts for map pitch, rotation and the actual viewport.
    Promise.all(markers.map(async (marker) => {
      try {
        const point = await mapRef.current.pointForCoordinate(marker.coordinate);
        if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return null;
        return { id: marker.id, ...point };
      } catch { return null; }
    })).then((points) => { if (active) setPositions(points.filter(Boolean)); });
    return () => { active = false; };
  }, [markers, mapRef, ready, region, revision, size.width, size.height]);
  return useMemo(() => {
    const byId = new Map(positions.map((point) => [point.id, point]));
    const points = markers.map((marker) => ({
      ...marker, ...byId.get(marker.id),
      label: isFundedMapMarker(marker.report?.funded_amount_cents)
        ? formatMapFundingLabel(marker.report.funded_amount_cents) : null,
    }));
    const projected = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
    const visible = projected.filter((point) => point.x > -70 && point.y > -70 && point.x < size.width + 70 && point.y < size.height + 70);
    // Keep unprojected reports discoverable while the native map becomes ready.
    return [...layoutMapLabels(visible, selectedId, fontScale), ...points.filter((point) => !Number.isFinite(point.x)).map((point) => ({ ...point, ...mapMarkerDimensions(point.label, cleanupMapTone(point.report), fontScale), labelled: false }))];
  }, [markers, positions, selectedId, size.width, size.height, fontScale]);
}
