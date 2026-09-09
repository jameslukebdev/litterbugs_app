import { cleanupMapTone } from './cleanupEligibility';

export const STATUS_MARKER_SIZE = 20;
export const STATUS_MARKER_ICON_SIZE = 11;

export const SELECTED_MARKER_SCALE = 1.5;
export const markerHostDimensions = (width, height) => ({ width: Math.max(44, Math.ceil(width * SELECTED_MARKER_SCALE)), height: Math.max(44, Math.ceil(height * SELECTED_MARKER_SCALE)) });

const statusPriority = (point) => ({ available: 2, active: 1, completed: 0 }[cleanupMapTone(point.report)]);

export function mapMarkerDimensions(label, tone, fontScale = 1) {
  const statusMarker = tone === 'completed' || tone === 'active';
  return {
    width: label ? Math.max(34, label.length * 8 * fontScale + 14 + (statusMarker ? STATUS_MARKER_ICON_SIZE + 3 : 0)) : STATUS_MARKER_SIZE,
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
    const { width, height } = mapMarkerDimensions(point.label, tone, fontScale);
    const scale = point.id === selectedId ? SELECTED_MARKER_SCALE : 1;
    const box = { x: point.x, y: point.y, width: width * scale, height: height * scale };
    const fits = !labels.some((other) =>
      Math.abs(other.x - box.x) < (other.width + box.width) / 2 + 6 &&
      Math.abs(other.y - box.y) < (other.height + box.height) / 2 + 6);
    if (fits || point.id === selectedId) labels.push(box);
    return { ...point, labelled: fits || point.id === selectedId, width, height };
  });
}

// Native onPress already identifies the tapped annotation. A generous touch host
// is not evidence of ambiguity: only nearly coincident map points need a chooser.
// Six screen points is smaller than a compact marker's visible footprint.
export function reportsNearMapTap(points, tappedId) {
  const tapped = points.find((point) => point.id === tappedId);
  if (!tapped) return [];
  return points.filter((point) => point.id === tappedId ||
    Math.hypot(point.x - tapped.x, point.y - tapped.y) <= 6
  ).sort((a, b) => String(a.id).localeCompare(String(b.id)));
}
