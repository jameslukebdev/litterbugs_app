import { MarkerClusterer, MarkerClustererEvents, ClusterStats, SuperClusterAlgorithm, type Cluster, type Marker, type AlgorithmInput, type AlgorithmOutput } from '@googlemaps/markerclusterer';
import type { MappableReport } from '@litterbugs/report-contract';
import { hideNativeTooltip, prepareCard, renderGroupCard, renderPinGlyph } from './map-marker-glyph';

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

export class MovingReportAlgorithm extends SuperClusterAlgorithm {
  private renderedSignature: string | null = null;
  private identities = new WeakMap<object, number>();
  private nextIdentity = 0;
  private renderedClusters: AlgorithmOutput['clusters'] = [];
  calculate(input: AlgorithmInput): AlgorithmOutput {
    const result = super.calculate(input);
    // Zoom changes alone do not require replacing the rendered marker DOM.
    // Compare member identities and centers, preserving redraws for real splits,
    // merges, additions, removals, and moved reports.
    const signature = result.clusters.map(cluster => {
      const members = (cluster.markers ?? []).map(marker => {
        if (!this.identities.has(marker)) this.identities.set(marker, ++this.nextIdentity);
        return this.identities.get(marker)!;
      }).sort((a, b) => a - b);
      return `${members.join(',')}@${cluster.position.lat()},${cluster.position.lng()}`;
    }).sort().join('|');
    if (signature === this.renderedSignature) return { clusters: this.renderedClusters, changed: false };
    this.renderedSignature = signature;
    this.renderedClusters = result.clusters;
    return { ...result, changed: true };
  }
  // Marker instances are intentionally stable; invalidate the spatial index only
  // when a report actually moves, not on status changes or background refreshes.
  invalidate() { this.markers = []; }
}

/** Do not detach/re-attach an individual pin that is already on the map. */
export function attachReportMarker(marker: google.maps.marker.AdvancedMarkerElement, map: google.maps.Map | null) {
  if ((marker.map ?? null) !== map) marker.map = map;
}

export class StableReportClusterer extends MarkerClusterer {
  private memberIds = new WeakMap<object, number>();
  private nextMemberId = 0;
  /** Group bubbles from the previous pass, keyed by membership; renderClusters takes the ones it reuses. */
  private reusableGroups = new Map<string, Marker>();
  private groupKey(cluster: Cluster) {
    return cluster.markers.map(marker => {
      if (!this.memberIds.has(marker)) this.memberIds.set(marker, ++this.nextMemberId);
      return this.memberIds.get(marker)!;
    }).sort((a, b) => a - b).join(',');
  }

  protected renderClusters() {
    const map = this.getMap() as google.maps.Map | null;
    if (!map) return;
    const stats = new ClusterStats(this.markers, this.clusters);
    for (const cluster of this.clusters) {
      if (cluster.markers.length === 1) {
        cluster.marker = cluster.markers[0];
      } else {
        const key = this.groupKey(cluster);
        const kept = this.reusableGroups.get(key) as google.maps.marker.AdvancedMarkerElement | undefined;
        if (kept) {
          this.reusableGroups.delete(key);
          kept.position = cluster.position;
          cluster.marker = kept;
        } else cluster.marker = this.renderer.render(cluster, stats, map);
        for (const marker of cluster.markers) attachReportMarker(marker as google.maps.marker.AdvancedMarkerElement, null);
      }
      // Our renderer uses AdvancedMarkerElement and owns its gmp-click handler.
      attachReportMarker(cluster.marker as google.maps.marker.AdvancedMarkerElement, map);
    }
  }

  /**
   * Same as MarkerClusterer.render, except a group whose members are unchanged keeps its existing
   * bubble instead of being redrawn. Zooming or panning re-runs clustering often; without this every
   * unchanged group (and its icon) blinks out and back in. Single pins were already kept.
   */
  render() {
    const map = this.getMap();
    if (!(map instanceof google.maps.Map) || !map.getProjection()) return;
    google.maps.event.trigger(this, MarkerClustererEvents.CLUSTERING_BEGIN, this);
    const { clusters, changed } = this.algorithm.calculate({ markers: this.markers, map, mapCanvasProjection: this.getProjection() });
    if (changed || changed === undefined) {
      const singles = new Set(clusters.filter(cluster => cluster.markers.length === 1).map(cluster => cluster.markers[0]));
      const previousGroups = new Map<string, Marker>();
      for (const cluster of this.clusters) {
        if (!cluster.marker) continue;
        if (cluster.markers.length === 1) {
          if (!singles.has(cluster.marker)) attachReportMarker(cluster.marker as google.maps.marker.AdvancedMarkerElement, null);
        } else previousGroups.set(this.groupKey(cluster), cluster.marker);
      }
      this.clusters = clusters;
      this.reusableGroups = previousGroups;
      this.renderClusters();
      // Only groups that really split or merged are removed, a frame later to avoid a gap.
      const stale = [...previousGroups.values()];
      this.reusableGroups = new Map();
      requestAnimationFrame(() => stale.forEach(marker => attachReportMarker(marker as google.maps.marker.AdvancedMarkerElement, null)));
    }
    google.maps.event.trigger(this, MarkerClustererEvents.CLUSTERING_END, this);
  }
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
    const label = `${summary.label}${selected ? '. Contains selected report' : ''}. Zoom in or choose a report`;
    if (visual.marker.getAttribute('aria-label') !== label) { visual.marker.title = label; hideNativeTooltip(visual.marker, label); }
    visual.glyph.classList.toggle('report-map-cluster-selected', selected);
    // The group shows the bug of its most useful member (open litter first) next to the count.
    renderPinGlyph(visual.glyph, summary.available ? 'open' : summary.active ? 'busy' : 'done', `${members.length}`, true);
    renderGroupCard(visual.glyph, members);
  };
  const clusterer = new StableReportClusterer({
    map, algorithm,
    renderer: { render: cluster => {
      const glyph = document.createElement('span');
      glyph.className = 'report-map-cluster';
      const marker = new AdvancedMarker({ position: cluster.position, gmpClickable: true, zIndex: 1000 + cluster.count });
      marker.append(glyph);
      const restingZ = 1000 + cluster.count;
      glyph.addEventListener('pointerenter', (event) => {
        if (event.pointerType !== 'mouse') return;
        marker.zIndex = 5000;
        prepareCard(glyph);
      });
      glyph.addEventListener('pointerleave', () => { marker.zIndex = restingZ; });
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
