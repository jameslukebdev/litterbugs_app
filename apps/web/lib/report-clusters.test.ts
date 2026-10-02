// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import type { MappableReport } from '@litterbugs/report-contract';
const { calls } = vi.hoisted(() => ({ calls: { add: vi.fn(), remove: vi.fn(), render: vi.fn(), setMap: vi.fn() } }));
vi.mock('@googlemaps/markerclusterer', () => ({
  SuperClusterAlgorithm: class {},
  MarkerClusterer: class { addMarker = calls.add; removeMarker = calls.remove; render = calls.render; setMap = calls.setMap; },
}));
import { clusterSummary, coincidentReports, createReportClusters } from './report-clusters';
const makeReport = (id: string, cleanup_state = 'available', latitude = 36) => ({ id, cleanup_state, latitude, longitude: -81 } as MappableReport);

it('counts every active state and distinguishes coincident reports from zoomable groups', () => {
  const reports = ['available', 'claimed', 'completion_submitted', 'changes_requested', 'completed'].map((state, i) => makeReport(String(i), state));
  expect(clusterSummary(reports)).toEqual({ available: 1, active: 3, completed: 1, label: '5 reports: 1 available, 3 in progress, 1 completed' });
  expect(coincidentReports(reports)).toBe(true);
  expect(coincidentReports([...reports, makeReport('far', 'available', 37)])).toBe(false);
});

it('keeps marker membership unchanged on reordered refreshes and only removes filtered reports', () => {
  vi.clearAllMocks();
  const controller = createReportClusters({} as google.maps.Map, class {} as typeof google.maps.marker.AdvancedMarkerElement, vi.fn());
  const a = makeReport('a'), b = makeReport('b');
  const markerA = {} as google.maps.marker.AdvancedMarkerElement, markerB = {} as google.maps.marker.AdvancedMarkerElement;
  const markers = new Map([['a', markerA], ['b', markerB]]);
  controller.update(markers, [a, b], null);
  controller.update(markers, [makeReport('b', 'completed'), a], 'a');
  expect(calls.add).toHaveBeenCalledTimes(2);
  expect(calls.remove).not.toHaveBeenCalled();
  controller.update(new Map([['b', markerB]]), [b], null);
  expect(calls.remove).toHaveBeenCalledExactlyOnceWith(markerA, true);
  controller.dispose();
  expect(calls.setMap).toHaveBeenCalledWith(null);
});
