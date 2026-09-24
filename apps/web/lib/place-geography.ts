import type { Coordinates } from '@litterbugs/report-contract';
export type BoundaryGeometry = { type: 'Polygon'; coordinates: number[][][] } | { type: 'MultiPolygon'; coordinates: number[][][][] };
export type PlaceBounds = { north: number; south: number; east: number; west: number };
export type SearchPlace = Coordinates & { id: string; label: string; subtitle: string; bounds: PlaceBounds; geometry?: BoundaryGeometry };
export function polygonParts(geometry: BoundaryGeometry) { return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates; }
function inRing(x: number, y: number, ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [a, b] = ring[i], [c, d] = ring[j];
    const cross = (x - a) * (d - b) - (y - b) * (c - a);
    if (Math.abs(cross) < 1e-10 && x >= Math.min(a, c) && x <= Math.max(a, c) && y >= Math.min(b, d) && y <= Math.max(b, d)) return true;
    if ((b > y) !== (d > y) && x < (c - a) * (y - b) / (d - b) + a) inside = !inside;
  }
  return inside;
}
export function inBoundary(point: Coordinates, geometry: BoundaryGeometry) {
  return polygonParts(geometry).some(([outer, ...holes]) => inRing(point.longitude, point.latitude, outer) && !holes.some(ring => inRing(point.longitude, point.latitude, ring)));
}
export function boundsForGeometry(geometry: BoundaryGeometry): PlaceBounds {
  const points = polygonParts(geometry).flat(2);
  if (!points.length || points.some(point => point.length < 2 || !point.every(Number.isFinite))) throw new Error('Boundary unavailable');
  let west = 180, east = -180, south = 90, north = -90;
  points.forEach(([x, y]) => { west = Math.min(west, x); east = Math.max(east, x); south = Math.min(south, y); north = Math.max(north, y); });
  return { west, east, south, north };
}
