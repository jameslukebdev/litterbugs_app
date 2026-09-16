import { cleanupMapTone } from './cleanupEligibility';

export const REPORT_MARKER_COLORS = Object.freeze({
  available: '#FDE8E8',
  availableAccent: '#E13B3B',
  active: '#FFF2C7',
  activeAccent: '#C78B00',
  completed: '#E3F3E5',
  completedAccent: '#2F7D32',
});

export function reportMarkerPresentation(report) {
  const key = cleanupMapTone(report);

  if (key === 'active') {
    return {
      key,
      backgroundColor: REPORT_MARKER_COLORS.active,
      borderColor: REPORT_MARKER_COLORS.activeAccent,
      foregroundColor: REPORT_MARKER_COLORS.activeAccent,
      icon: 'time-outline',
      statusIcon: null,
      accessibilityLabel: 'Cleanup in progress',
    };
  }

  if (key === 'completed') {
    return {
      key,
      backgroundColor: REPORT_MARKER_COLORS.completed,
      borderColor: REPORT_MARKER_COLORS.completedAccent,
      foregroundColor: REPORT_MARKER_COLORS.completedAccent,
      icon: 'leaf-outline',
      statusIcon: 'checkmark',
      accessibilityLabel: 'Cleanup completed',
    };
  }

  return {
    key: 'available',
    backgroundColor: REPORT_MARKER_COLORS.available,
    borderColor: REPORT_MARKER_COLORS.availableAccent,
    foregroundColor: '#B4232C',
    icon: null,
    statusIcon: null,
    accessibilityLabel: 'Cleanup available',
  };
}

export function clusterStatusCounts(leaves = []) {
  return leaves.reduce((counts, leaf) => {
    const [, mapTone] = String(leaf?.properties?.identifier || '').split(':');
    if (mapTone === 'available' || mapTone === 'active' || mapTone === 'completed') {
      counts[mapTone] += 1;
    }
    return counts;
  }, { available: 0, active: 0, completed: 0 });
}
