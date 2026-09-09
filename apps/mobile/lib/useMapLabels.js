import { projectMapPoints } from './mapWorkBudget';
import { useEffect, useMemo, useState } from 'react';
import { layoutMapLabels, mapMarkerDimensions } from './mapLabelLayout';
import { cleanupMapTone } from './cleanupEligibility';
import { formatMapFundingLabel } from './mapFundingMarker';

export default function useMapLabels({ markers, mapRef, ready, region, revision, size, selectedId, fontScale }) {
  const [positions, setPositions] = useState([]);
  useEffect(() => {
    let active = true;
    if (!ready || !mapRef.current) return undefined;
    // Native projection accounts for map pitch, rotation and the actual viewport.
    projectMapPoints(markers, coordinate => mapRef.current.pointForCoordinate(coordinate), () => active)
      .then(points => { if (active) setPositions(points); });
    return () => { active = false; };
  }, [markers, mapRef, ready, region, revision, size.width, size.height]);
  return useMemo(() => {
    const byId = new Map(positions.map((point) => [point.id, point]));
    const points = markers.map((marker) => ({
      ...marker, ...byId.get(marker.id),
      label: formatMapFundingLabel(marker.report?.funded_amount_cents),
    }));
    const projected = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
    const visible = projected.filter((point) => point.x > -70 && point.y > -70 && point.x < size.width + 70 && point.y < size.height + 70);
    // Keep unprojected reports discoverable while the native map becomes ready.
    return [...layoutMapLabels(visible, selectedId, fontScale), ...points.filter((point) => !Number.isFinite(point.x)).map((point) => ({ ...point, ...mapMarkerDimensions(point.label, cleanupMapTone(point.report), fontScale), labelled: false }))];
  }, [markers, positions, selectedId, size.width, size.height, fontScale]);
}
