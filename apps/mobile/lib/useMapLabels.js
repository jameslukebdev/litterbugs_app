import { projectMapPoints } from './mapWorkBudget';
import { useEffect, useMemo, useState } from 'react';
import { layoutProjectedMapLabels } from './mapLabelLayout';
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
    return layoutProjectedMapLabels(points, size, selectedId, fontScale);
  }, [markers, positions, selectedId, size.width, size.height, fontScale]);
}
