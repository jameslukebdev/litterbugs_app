import { cleanupMapTone } from './cleanupEligibility';

export const STATUS_MARKER_SIZE = 28;
export const STATUS_MARKER_ICON_SIZE = 16;

const statusPriority = (point) => ({ available: 2, active: 1, completed: 0 }[cleanupMapTone(point.report)]);

// Screen-space labels: every report remains a marker, even when its label does not fit.
export function layoutMapLabels(points, selectedId, fontScale = 1) {
  const labels = [];
  const ordered = [...points].sort((a, b) =>
    Number(b.id === selectedId) - Number(a.id === selectedId) ||
    statusPriority(b) - statusPriority(a) || String(a.id).localeCompare(String(b.id)));
  return ordered.map((point) => {
    const tone = cleanupMapTone(point.report);
    const statusMarker = tone === 'completed' || tone === 'active';
    const width = statusMarker ? STATUS_MARKER_SIZE : Math.max(42, (point.label?.length || 1) * 9 * fontScale + 30);
    const height = statusMarker ? STATUS_MARKER_SIZE : Math.max(32, 20 * fontScale + 12);
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
    Math.abs(point.x - tapped.x) < (Math.max(44, tapped.labelled ? tapped.width : 12) + Math.max(44, point.labelled ? point.width : 12)) / 2 &&
    Math.abs(point.y - tapped.y) < (Math.max(44, tapped.labelled ? tapped.height : 12) + Math.max(44, point.labelled ? point.height : 12)) / 2
  )).sort((a, b) => String(a.id).localeCompare(String(b.id)));
}
