export const REPORT_MARKER_COLORS = Object.freeze({
  available: '#D32F2F',
  active: '#E0A800',
  completed: '#2F7D32',
});

export function reportMarkerPresentation(report, mapTone) {
  if (mapTone === 'active') {
    return {
      backgroundColor: REPORT_MARKER_COLORS.active,
      icon: 'time-outline',
      iconFamily: 'ionicons',
      statusIcon: null,
    };
  }

  if (mapTone === 'completed') {
    return {
      backgroundColor: REPORT_MARKER_COLORS.completed,
      icon: 'leaf-outline',
      iconFamily: 'ionicons',
      statusIcon: 'checkmark',
    };
  }

  const severity = String(report?.severity || '').toLowerCase();
  const lowSeverity = severity === 'low';

  return {
    backgroundColor: REPORT_MARKER_COLORS.available,
    icon: lowSeverity
      ? 'bottle-soda-outline'
      : severity === 'high'
        ? 'warning-outline'
        : 'trash-outline',
    iconFamily: lowSeverity ? 'material-community' : 'ionicons',
    statusIcon: null,
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
