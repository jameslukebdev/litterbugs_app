import { MarkerClusterer, SuperClusterAlgorithm, type Marker } from '@googlemaps/markerclusterer';
import type { MappableReport } from '@litterbugs/report-contract';

export function clusterSummary(reports: MappableReport[]) {
  const counts = { available: 0, active: 0, completed: 0 };
  for (const report of reports) {
    if (report.cleanup_state === 'completed') counts.completed++;
    else if (['claimed', 'completion_submitted', 'changes_requested'].includes(report.cleanup_state ?? '')) counts.active++;
    else counts.available++;
  }
  return { ...counts, label: `${reports.length} reports: ${counts.available} available, ${counts.active} in progress, ${counts.completed} completed` };
}

export function coincidentReports(reports: MappableReport[]) {
  return reports.every(report => Math.abs(report.latitude - reports[0].latitude) < .000001 && Math.abs(report.longitude - reports[0].longitude) < .000001);
}

class MovingReportAlgorithm extends SuperClusterAlgorithm {
  // Marker instances are intentionally stable; invalidate the spatial index only
  // when a report actually moves, not on status changes or background refreshes.
  invalidate() { this.markers = []; }
}

export function createReportClusters(map: google.maps.Map, AdvancedMarker: typeof google.maps.marker.AdvancedMarkerElement, choose: (ids: string[]) => void) {
  const reportsByMarker = new Map<Marker, MappableReport>();
  const visuals = new Set<{ marker: google.maps.marker.AdvancedMarkerElement; glyph: HTMLElement; ids: string[] }>();
  let currentReports = new Map<string, MappableReport>();
  let selectedId: string | null = null;
  const algorithm = new MovingReportAlgorithm({ radius: 120, maxZoom: 22 });
  const updateVisual = (visual: { marker: google.maps.marker.AdvancedMarkerElement; glyph: HTMLElement; ids: string[] }) => {
    const members = visual.ids.map(id => currentReports.get(id)).filter((report): report is MappableReport => Boolean(report));
    const summary = clusterSummary(members);
    const selected = Boolean(selectedId && visual.ids.includes(selectedId));
    visual.marker.title = `${summary.label}${selected ? '. Contains selected report' : ''}. Zoom in or choose a report`;
    visual.glyph.classList.toggle('report-map-cluster-selected', selected);
    const text = `${members.length}`;
    if (visual.glyph.textContent !== text) visual.glyph.textContent = text;
  };
  const clusterer = new MarkerClusterer({
    map, algorithm,
    renderer: { render: cluster => {
      const glyph = document.createElement('span');
      glyph.className = 'report-map-cluster';
      const marker = new AdvancedMarker({ position: cluster.position, gmpClickable: true, zIndex: 1000 + cluster.count });
      marker.append(glyph);
      marker.addEventListener('gmp-click', () => {
        const members = cluster.markers.map(item => reportsByMarker.get(item)).filter((report): report is MappableReport => Boolean(report));
        if ((map.getZoom() ?? 0) >= 20 || coincidentReports(members)) choose(members.map(report => report.id));
        else if (cluster.bounds) map.fitBounds(cluster.bounds, 80);
      });
      const visual = { marker, glyph, ids: cluster.markers.map(item => reportsByMarker.get(item)?.id).filter((id): id is string => Boolean(id)) };
      updateVisual(visual); visuals.add(visual);
      return marker;
    } },
    // Disable the library's legacy addListener bridge. Advanced Markers use
    // native gmp-click events above for pointer and keyboard activation.
    onClusterClick: null!,
  });
  return {
    update(markers: Map<string, google.maps.marker.AdvancedMarkerElement>, reports: MappableReport[], selected: string | null) {
      currentReports = new Map(reports.map(report => [report.id, report])); selectedId = selected;
      let moved = false;
      for (const [marker, previous] of reportsByMarker) {
        if (!markers.has(previous.id)) { clusterer.removeMarker(marker, true); reportsByMarker.delete(marker); }
      }
      for (const report of reports) {
        const marker = markers.get(report.id);
        if (!marker) continue;
        const previous = reportsByMarker.get(marker);
        if (previous && (previous.latitude !== report.latitude || previous.longitude !== report.longitude)) moved = true;
        if (!previous) clusterer.addMarker(marker, true);
        reportsByMarker.set(marker, report);
      }
      if (moved) algorithm.invalidate();
      clusterer.render();
      for (const visual of visuals) {
        if (visual.marker.map !== map) visuals.delete(visual);
        else updateVisual(visual);
      }
    },
    select(id: string | null) { selectedId = id; for (const visual of visuals) updateVisual(visual); },
    dispose() { clusterer.setMap(null); visuals.clear(); reportsByMarker.clear(); },
  };
}
