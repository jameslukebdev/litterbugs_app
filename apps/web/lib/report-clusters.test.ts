// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import type { MappableReport } from '@litterbugs/report-contract';
const { calls } = vi.hoisted(() => ({ calls: { add: vi.fn(), remove: vi.fn(), render: vi.fn(), setMap: vi.fn(), calculate: vi.fn() } }));
vi.mock('@googlemaps/markerclusterer', () => ({
  ClusterStats: class {},
  SuperClusterAlgorithm: class { calculate(input: unknown) { return calls.calculate(input); } },
  MarkerClusterer: class { addMarker = calls.add; removeMarker = calls.remove; render = calls.render; setMap = calls.setMap; },
}));
import { clusterSummary, coincidentReports, createReportClusters, MovingReportAlgorithm, attachReportMarker, StableReportClusterer } from './report-clusters';
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


it('preserves rendered clusters across zooms with identical membership but redraws splits and movement', () => {
  const a = {}, b = {};
  const group = (members: object[], lat = 36) => ({ markers: members, position: { lat: () => lat, lng: () => -81 } });
  const original = [group([a, b])];
  calls.calculate.mockReturnValueOnce({ clusters: original, changed: true })
    .mockReturnValueOnce({ clusters: [group([b, a])], changed: true })
    .mockReturnValueOnce({ clusters: [group([a]), group([b], 37)], changed: true })
    .mockReturnValueOnce({ clusters: [group([a]), group([b], 38)], changed: true });
  const algorithm = new MovingReportAlgorithm({ radius: 120 });
  const input = {} as Parameters<MovingReportAlgorithm['calculate']>[0];
  expect(algorithm.calculate(input).changed).toBe(true);
  const unchanged = algorithm.calculate(input);
  expect(unchanged.changed).toBe(false);
  expect(unchanged.clusters).toBe(original);
  expect(algorithm.calculate(input).changed).toBe(true);
  expect(algorithm.calculate(input).changed).toBe(true);
});


it('does not reattach unchanged individual pins when other markers redraw', () => {
  const map = {} as google.maps.Map;
  let current: google.maps.Map | null = null;
  const assignments = vi.fn();
  const marker = { get map() { return current; }, set map(value: google.maps.Map | null) { current = value; assignments(value); } } as google.maps.marker.AdvancedMarkerElement;
  attachReportMarker(marker, map);
  attachReportMarker(marker, map);
  attachReportMarker(marker, map);
  expect(assignments).toHaveBeenCalledTimes(1);
  attachReportMarker(marker, null);
  attachReportMarker(marker, null);
  expect(assignments).toHaveBeenCalledTimes(2);
  attachReportMarker(marker, map);
  expect(assignments).toHaveBeenCalledTimes(3);
});


it('retains a pin attachment through renderer passes after zoom', () => {
  const map = {} as google.maps.Map;
  const writes = vi.fn();
  let attached: google.maps.Map | null = null;
  const pin = { get map() { return attached; }, set map(value: google.maps.Map | null) { attached = value; writes(value); } } as google.maps.marker.AdvancedMarkerElement;
  class Harness extends StableReportClusterer {
    draw() {
      this.markers = [pin];
      this.clusters = [{ markers: [pin] }] as typeof this.clusters;
      this.getMap = () => map;
      this.renderClusters();
    }
  }
  const renderer = new Harness({});
  renderer.draw(); renderer.draw(); renderer.draw();
  expect(writes).toHaveBeenCalledExactlyOnceWith(map);
});
