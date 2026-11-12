import Supercluster from 'supercluster';
import GeoViewport from '@mapbox/geo-viewport';
import { describe, expect, it } from 'vitest';
import { regionForGroup } from './clusterZoom';

// The same sums react-native-map-clustering uses (lib/helpers.js), on a phone-sized screen.
const SCREEN = [402, 874];
const bbox = region => [
  region.longitude - region.longitudeDelta, region.latitude - region.latitudeDelta,
  region.longitude + region.longitudeDelta, region.latitude + region.latitudeDelta,
];
const zoomOf = region => GeoViewport.viewport(bbox(region), SCREEN).zoom;
const point = (longitude, latitude, id) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [longitude, latitude] }, properties: { id } });
const MAX_ZOOM = 14;

function tap(points, region) {
  const clusters = new Supercluster({ radius: 80, maxZoom: MAX_ZOOM, minZoom: 1, extent: 512, nodeSize: 64 });
  clusters.load(points);
  const group = clusters.getClusters(bbox(region), zoomOf(region)).find(feature => feature.properties.cluster);
  const id = group.properties.cluster_id;
  const leaves = clusters.getLeaves(id, Infinity);
  const next = regionForGroup({ leaves, splitZoom: clusters.getClusterExpansionZoom(id), closestZoom: MAX_ZOOM + 1, currentRegion: region, zoomOf });
  const shown = clusters.getClusters(bbox(next), zoomOf(next));
  return { next, leaves, shown, group };
}

const inMiddle = (next, leaves) => leaves.every(({ geometry: { coordinates: [lng, lat] } }) =>
  Math.abs(lng - next.longitude) <= next.longitudeDelta * 0.3 + 1e-9
  && Math.abs(lat - next.latitude) <= next.latitudeDelta * 0.25 + 1e-9);

describe('tapping a group', () => {
  const region = { latitude: 36.2, longitude: -81.7, latitudeDelta: 0.78, longitudeDelta: 0.5 };

  it('splits two nearby reports and spreads them over the middle of the screen', () => {
    const { next, leaves, shown } = tap([point(-81.830, 36.084, 'a'), point(-81.871, 36.071, 'b')], region);
    expect(shown.filter(feature => !feature.properties.cluster).map(feature => feature.properties.id).sort()).toEqual(['a', 'b']);
    expect(inMiddle(next, leaves)).toBe(true);
    // Spread out, not bunched in the centre: they span well over a third of the width.
    expect(Math.abs(-81.830 - -81.871) / next.longitudeDelta).toBeGreaterThan(0.5);
  });

  it('zooms in further than the spread when that is what it takes to split the group', () => {
    const close = [point(-81.7, 36.2, 'a'), point(-81.6999, 36.2001, 'b'), point(-81.6, 36.25, 'c')];
    const { shown, group } = tap(close, { ...region, latitudeDelta: 6, longitudeDelta: 4 });
    expect(group.properties.point_count).toBe(3);
    expect(shown.some(feature => feature.properties.cluster && feature.properties.point_count === 3)).toBe(false);
  });

  it('shows a wide group whole, centred on its reports, rather than diving into one spot', () => {
    const wide = [point(-81.6122, 36.2622, 'a'), point(-81.6124, 36.2622, 'b'), point(-81.68, 36.21, 'c'), point(-79.79, 36.03, 'd'), point(-79.77, 36.04, 'e')];
    const { next, leaves } = tap(wide, { latitude: 38, longitude: -87, latitudeDelta: 52, longitudeDelta: 35 });
    expect(inMiddle(next, leaves)).toBe(true);
    expect(next.longitudeDelta).toBeGreaterThan(2);
  });

  it('stops at the closest grouping zoom for reports at the same spot', () => {
    const { next } = tap([point(-81.68, 36.214, 'a'), point(-81.68, 36.214, 'b')], region);
    expect(zoomOf(next)).toBe(MAX_ZOOM + 1);
    expect(zoomOf({ ...next, latitudeDelta: next.latitudeDelta * 1.2, longitudeDelta: next.longitudeDelta * 1.2 })).toBeLessThan(MAX_ZOOM + 1);
  });
});
