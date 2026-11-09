// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import type { MappableReport } from '@litterbugs/report-contract';
const { calls } = vi.hoisted(() => ({ calls: { add: vi.fn(), remove: vi.fn(), render: vi.fn(), setMap: vi.fn(), calculate: vi.fn() } }));
vi.mock('@googlemaps/markerclusterer', () => ({
  ClusterStats: class {},
  MarkerClustererEvents: { CLUSTERING_BEGIN: 'clusteringbegin', CLUSTERING_END: 'clusteringend' },
  SuperClusterAlgorithm: class { calculate(input: unknown) { return calls.calculate(input); } },
  MarkerClusterer: class {
    addMarker = calls.add;
    removeMarker = calls.remove;
    render = calls.render;
    setMap = calls.setMap;
    getProjection() { return {}; }
  },
}));
import { clusterSummary, coincidentReports, createReportClusters, MovingReportAlgorithm, attachReportMarker, StableReportClusterer } from './report-clusters';
const makeReport = (id: string, cleanup_state = 'available', latitude = 36) => ({ id, cleanup_state, latitude, longitude: -81 } as MappableReport);

afterEach(() => vi.unstubAllGlobals());

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

it('lands only the pins entering the viewport even when panning keeps the same clusters', () => {
  const visible = new Set<google.maps.LatLng>();
  class MapViewport {
    getBounds() { return { contains: (position: google.maps.LatLng) => visible.has(position) }; }
    getProjection() { return {}; }
  }
  const map = new MapViewport();
  vi.stubGlobal('google', { maps: { Map: MapViewport, event: { trigger: vi.fn() } } });
  vi.stubGlobal('matchMedia', () => ({ matches: false }));

  const pin = (latitude: number) => {
    const marker = document.createElement('span');
    const glyph = document.createElement('span');
    marker.append(glyph);
    return { marker, glyph, position: { lat: () => latitude, lng: () => -81 } as google.maps.LatLng };
  };
  const first = pin(36), second = pin(37), third = pin(38);
  class Harness extends StableReportClusterer {
    configure() {
      this.clusters = [first, second, third] as unknown as typeof this.clusters;
      this.algorithm = { calculate: () => ({ clusters: this.clusters, changed: false }) };
      this.getMap = () => map as unknown as google.maps.Map;
    }
    draw() { super.render(); }
  }
  const renderer = new Harness({});
  renderer.configure();
  visible.add(first.position);
  renderer.draw();
  expect(first.glyph.classList.contains('bug-pin-land')).toBe(true);
  expect(second.glyph.classList.contains('bug-pin-land')).toBe(false);
  first.glyph.dispatchEvent(Object.assign(new Event('animationend'), { animationName: 'bug-land' }));

  visible.add(second.position);
  visible.add(third.position);
  renderer.draw();
  expect(first.glyph.classList.contains('bug-pin-land')).toBe(false);
  expect(second.glyph.style.animationDelay).toBe('0ms');
  expect(third.glyph.style.animationDelay).toBe('60ms');

  visible.delete(first.position);
  renderer.draw();
  visible.add(first.position);
  renderer.draw();
  expect(first.glyph.classList.contains('bug-pin-land')).toBe(true);
});

it('lands pins when clusters split and lands new groups when they merge', () => {
  class MapViewport {
    getBounds() { return { contains: () => true }; }
    getProjection() { return {}; }
  }
  const map = new MapViewport();
  vi.stubGlobal('google', { maps: { Map: MapViewport, event: { trigger: vi.fn() } } });
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const marker = () => {
    const node = document.createElement('span');
    node.append(document.createElement('span'));
    return node as unknown as google.maps.marker.AdvancedMarkerElement;
  };
  const first = marker(), second = marker(), steady = marker();
  const group = (...markers: google.maps.marker.AdvancedMarkerElement[]) => ({
    markers, position: { lat: () => 36, lng: () => -81 },
  });
  const groups: google.maps.marker.AdvancedMarkerElement[] = [];
  const landing = (pin: google.maps.marker.AdvancedMarkerElement) => pin.firstElementChild?.classList.contains('bug-pin-land');
  const finish = (pin: google.maps.marker.AdvancedMarkerElement) =>
    pin.firstElementChild?.dispatchEvent(Object.assign(new Event('animationend'), { animationName: 'bug-land' }));
  class Harness extends StableReportClusterer {
    draw(...clusters: ReturnType<typeof group>[]) {
      this.clusters ??= [];
      this.markers = [first, second, steady];
      this.getMap = () => map as unknown as google.maps.Map;
      this.renderer = { render: () => {
        const bubble = marker();
        groups.push(bubble);
        return bubble;
      } };
      this.algorithm = { calculate: () => ({ clusters: clusters as unknown as typeof this.clusters, changed: true }) };
      super.render();
    }
  }
  const renderer = new Harness({});
  renderer.draw(group(first, second), group(steady));
  expect(landing(groups[0])).toBe(true);
  expect(landing(first)).toBe(false);
  finish(groups[0]);
  finish(steady);

  renderer.draw(group(first), group(second), group(steady));
  expect(landing(first)).toBe(true);
  expect(landing(second)).toBe(true);
  expect(landing(steady)).toBe(false);

  renderer.draw(group(first, second), group(steady));
  expect(groups).toHaveLength(2);
  expect(landing(groups[1])).toBe(true);
  expect(landing(steady)).toBe(false);
});
