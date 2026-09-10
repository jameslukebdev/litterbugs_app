import { cleanupMapTone } from './cleanupEligibility';

export const STATUS_MARKER_SIZE = 20;
export const STATUS_MARKER_ICON_SIZE = 11;

export const SELECTED_MARKER_SCALE = 1.5;
export const markerHostDimensions = (width, height) => ({ width: Math.max(44, Math.ceil(width * SELECTED_MARKER_SCALE)), height: Math.max(44, Math.ceil(height * SELECTED_MARKER_SCALE)) });

const statusPriority = (point) => ({ available: 2, active: 1, completed: 0 }[cleanupMapTone(point.report)]);

export function mapMarkerDimensions(label, tone, fontScale = 1) {
  const statusMarker = tone === 'completed' || tone === 'active';
  return {
    fontSize: 13 * fontScale,
    width: label ? Math.max(34, label.length * 8.5 * fontScale + 14 + (statusMarker ? STATUS_MARKER_ICON_SIZE + 3 : 0)) : STATUS_MARKER_SIZE,
    height: label ? Math.max(24, 18 * fontScale + 6) : STATUS_MARKER_SIZE,
  };
}

// Screen-space labels: every report remains a marker, even when its label does not fit.
export function layoutMapLabels(points, selectedId, fontScale = 1) {
  const labels = [];
  const ordered = [...points].sort((a, b) =>
    Number(b.id === selectedId) - Number(a.id === selectedId) ||
    statusPriority(b) - statusPriority(a) || String(a.id).localeCompare(String(b.id)));
  return ordered.map((point) => {
    const tone = cleanupMapTone(point.report);
    const { width, height, fontSize } = mapMarkerDimensions(point.label, tone, fontScale);
    const scale = point.id === selectedId ? SELECTED_MARKER_SCALE : 1;
    const box = { x: point.x, y: point.y, width: width * scale, height: height * scale };
    const fits = !labels.some((other) =>
      Math.abs(other.x - box.x) < (other.width + box.width) / 2 + 6 &&
      Math.abs(other.y - box.y) < (other.height + box.height) / 2 + 6);
    if (fits || point.id === selectedId) labels.push(box);
    return { ...point, selected: point.id === selectedId, labelled: fits || point.id === selectedId, width, height, fontSize };
  });
}

// Projection is asynchronous and describes the last settled camera. Use it to
// allocate labels, never to remove native annotations while the camera moves.
export function layoutProjectedMapLabels(points, size, selectedId, fontScale = 1) {
  const visible = points.filter(point => Number.isFinite(point.x) && Number.isFinite(point.y) &&
    point.x > -70 && point.y > -70 && point.x < size.width + 70 && point.y < size.height + 70);
  const labelsById = new Map(layoutMapLabels(visible, selectedId, fontScale).map(point => [point.id, point]));
  return points.map(point => labelsById.get(point.id) || {
    ...point,
    ...mapMarkerDimensions(point.label, cleanupMapTone(point.report), fontScale),
    selected: point.id === selectedId,
    labelled: point.id === selectedId,
  });
}

function visibleMarkerSize(point) {
  const tone = cleanupMapTone(point.report);
  const size = point.labelled && point.label
    ? { width: point.width, height: point.height }
    : { width: tone === 'available' && !point.labelled ? 10 : STATUS_MARKER_SIZE,
        height: tone === 'available' && !point.labelled ? 10 : STATUS_MARKER_SIZE };
  const scale = point.selected ? SELECTED_MARKER_SCALE : 1;
  return { width: size.width * scale, height: size.height * scale };
}

// MapKit may deliver a tap to a larger annotation covering the intended report.
// Use visible geometry, not the extra invisible touch/selection host space.
export function reportsNearMapTap(points, tappedId, touchPoint) {
  // iOS annotation hosts reserve selection space and can intercept a neighbour's
  // tap. Prefer the visible shapes under the actual map-local touch position.
  if (Number.isFinite(touchPoint?.x) && Number.isFinite(touchPoint?.y)) {
    const touched = points.filter(point => {
      const size = visibleMarkerSize(point);
      return Math.abs(point.x - touchPoint.x) <= size.width / 2 + 2 &&
        Math.abs(point.y - touchPoint.y) <= size.height / 2 + 2;
    });
    if (touched.length) return touched.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  }
  const tapped = points.find((point) => point.id === tappedId);
  if (!tapped) return [];
  const tappedSize = visibleMarkerSize(tapped);
  return points.filter((point) => {
    if (point.id === tappedId) return true;
    const size = visibleMarkerSize(point);
    return Math.hypot(point.x - tapped.x, point.y - tapped.y) <= 6 ||
      (Math.abs(point.x - tapped.x) < (size.width + tappedSize.width) / 2 &&
       Math.abs(point.y - tapped.y) < (size.height + tappedSize.height) / 2);
  }).sort((a, b) => String(a.id).localeCompare(String(b.id)));
}
