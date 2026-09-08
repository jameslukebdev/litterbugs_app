// GeoJSON uses longitude, latitude. The same geometry drives drawing and filtering.
export function polygonParts(geometry) {
  if (geometry?.type === 'Polygon') return [geometry.coordinates];
  if (geometry?.type === 'MultiPolygon') return geometry.coordinates;
  return [];
}
function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [a, b] = ring[i], [c, d] = ring[j];
    const cross = (x - a) * (d - b) - (y - b) * (c - a);
    if (Math.abs(cross) < 1e-10 && x >= Math.min(a, c) && x <= Math.max(a, c) && y >= Math.min(b, d) && y <= Math.max(b, d)) return true;
    if ((b > y) !== (d > y) && x < (c - a) * (y - b) / (d - b) + a) inside = !inside;
  }
  return inside;
}
export function inBoundary(point, geometry) {
  return polygonParts(geometry).some(([outer, ...holes]) => inRing(point.longitude, point.latitude, outer) && !holes.some(ring => inRing(point.longitude, point.latitude, ring)));
}
export function inViewport(point, region) {
  if (![point?.latitude, point?.longitude].every(Number.isFinite)) return false;
  const longitudeDistance = Math.abs(((point.longitude - region.longitude + 540) % 360) - 180);
  return Math.abs(point.latitude - region.latitude) <= region.latitudeDelta / 2 + 1e-7 && longitudeDistance <= region.longitudeDelta / 2 + 1e-7;
}
export function matchesGeography(point, region, place) {
  return inViewport(point, region) && (!place?.geometry || inBoundary(point, place.geometry));
}
export function regionForGeometry(geometry) {
  const points = polygonParts(geometry).flat(2);
  if (!points.length) throw new Error('No boundary available');
  let west = 180, east = -180, south = 90, north = -90;
  points.forEach(([x, y]) => { west = Math.min(west, x); east = Math.max(east, x); south = Math.min(south, y); north = Math.max(north, y); });
  return { latitude: (south + north) / 2, longitude: (west + east) / 2,
    latitudeDelta: Math.max(0.005, (north - south) * 1.7), longitudeDelta: Math.max(0.005, (east - west) * 1.35) };
}
