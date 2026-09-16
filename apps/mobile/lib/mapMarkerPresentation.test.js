import { describe, expect, it } from 'vitest';

import {
  clusterStatusCounts,
  REPORT_MARKER_COLORS,
  reportMarkerPresentation,
} from './mapMarkerPresentation';

describe('map marker presentation', () => {
  it('uses a light red dollar marker for an available report', () => {
    expect(reportMarkerPresentation({ cleanup_state: 'available' })).toMatchObject({
      key: 'available',
      backgroundColor: REPORT_MARKER_COLORS.available,
      icon: null,
    });
  });

  it.each(['claimed', 'completion_submitted', 'changes_requested'])('uses a gold clock for %s', (cleanup_state) => {
    expect(reportMarkerPresentation({ cleanup_state })).toMatchObject({
      key: 'active',
      backgroundColor: REPORT_MARKER_COLORS.active,
      icon: 'time-outline',
    });
  });

  it('uses a green leaf and check for completed cleanups', () => {
    expect(reportMarkerPresentation({ cleanup_state: 'completed' })).toMatchObject({
      key: 'completed',
      backgroundColor: REPORT_MARKER_COLORS.completed,
      icon: 'leaf-outline',
      statusIcon: 'checkmark',
    });
  });

  it('counts all three report states within a cluster', () => {
    expect(clusterStatusCounts([
      { properties: { identifier: 'report:available:1' } },
      { properties: { identifier: 'report:active:2' } },
      { properties: { identifier: 'report:completed:3' } },
      { properties: { identifier: 'report:available:4' } },
    ])).toEqual({ available: 2, active: 1, completed: 1 });
  });
});
