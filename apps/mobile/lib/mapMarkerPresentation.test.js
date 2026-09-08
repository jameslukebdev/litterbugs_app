import { describe, expect, it } from 'vitest';

import {
  clusterStatusCounts,
  REPORT_MARKER_COLORS,
  reportMarkerPresentation,
} from './mapMarkerPresentation';

describe('map marker presentation', () => {
  it.each([
    ['Low', 'bottle-soda-outline', 'material-community'],
    ['Medium', 'trash-outline', 'ionicons'],
    ['High', 'warning-outline', 'ionicons'],
  ])('uses severity iconography for available %s reports', (severity, icon, iconFamily) => {
    expect(reportMarkerPresentation({ severity }, 'available')).toEqual({
      backgroundColor: REPORT_MARKER_COLORS.available,
      icon,
      iconFamily,
      statusIcon: null,
    });
  });

  it('uses a yellow clock for every active cleanup state', () => {
    expect(reportMarkerPresentation({ severity: 'High' }, 'active')).toMatchObject({
      backgroundColor: REPORT_MARKER_COLORS.active,
      icon: 'time-outline',
    });
  });

  it('uses a green leaf and check for completed cleanups', () => {
    expect(reportMarkerPresentation({ severity: 'Low' }, 'completed')).toMatchObject({
      backgroundColor: REPORT_MARKER_COLORS.completed,
      icon: 'leaf-outline',
      statusIcon: 'checkmark',
    });
  });

  it('counts available, active, and completed reports within a cluster', () => {
    expect(clusterStatusCounts([
      { properties: { identifier: 'report:available:1' } },
      { properties: { identifier: 'report:active:2' } },
      { properties: { identifier: 'report:completed:3' } },
      { properties: { identifier: 'report:available:4' } },
    ])).toEqual({ available: 2, active: 1, completed: 1 });
  });
});
