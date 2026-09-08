import { cleanupMapTone } from './cleanupEligibility';

export const STATUS_MARKER_SIZE = 28;
export const STATUS_MARKER_ICON_SIZE = 14;

const statusPriority = (point) => ({ available: 2, active: 1, completed: 0 }[cleanupMapTone(point.report)]);

export function mapMarkerDimensions(label, tone, fontScale = 1) {
  const statusMarker = tone === 'completed' || tone === 'active';
  return {
    width: label ? Math.max(48, label.length * 9 * fontScale + 28 + (statusMarker ? STATUS_MARKER_ICON_SIZE + 4 : 0)) : STATUS_MARKER_SIZE,
    height: label ? Math.max(32, 20 * fontScale + 12) : STATUS_MARKER_SIZE,
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
    const box = { x: point.x, y: point.y, width, height };
    const fits = !labels.some((other) =>
      Math.abs(other.x - box.x) < (other.width + width) / 2 + 10 &&
      Math.abs(other.y - box.y) < (other.height + height) / 2 + 10);
    if (fits || point.id === selectedId) labels.push(box);
    return { ...point, labelled: fits || point.id === selectedId, width, height };
  });
}

// Resolve overlapping touch targets explicitly instead of letting native draw order hide reports.
export function reportsNearMapTap(points, tappedId) {
  const tapped = points.find((point) => point.id === tappedId);
  if (!tapped) return [];
  return points.filter((point) => point.id === tappedId || (
    Math.abs(point.x - tapped.x) < (Math.max(44, tapped.width || 44) + Math.max(44, point.width || 44)) / 2 &&
    Math.abs(point.y - tapped.y) < (Math.max(44, tapped.height || 44) + Math.max(44, point.height || 44)) / 2
  )).sort((a, b) => String(a.id).localeCompare(String(b.id)));
}
