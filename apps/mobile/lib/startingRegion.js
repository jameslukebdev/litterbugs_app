// Where the map opens for someone with no saved map: always somewhere with pins.
//
// With a known location, it shows that spot widened just enough to take in the nearest
// reports. Without one (or with no reports anywhere near), it opens on the busiest area.
import { supabase } from './supabase';
import { completedImpactReportFilter } from './reportVisibility';
import { distanceMiles } from './reportFilters';

const NEAR_MILES = 50;          // reports farther than this don't count as "near you"
// About three miles across: close enough that a town's pins show one by one or in small groups
// (the map groups pins within 80 points of each other), instead of one big numbered group.
const BUSY_VIEW_DELTA = 0.05;
const BUSY_WINDOW = 0.06;       // the area searched for the most reports, in degrees
const MAX_NEAREST = 8;
const MIN_DELTA = 0.06;         // about four miles: never zoom in tighter than a neighborhood
const PADDING = 1.6;            // room for the header above and the controls below

export async function loadReportPoints(limit = 1000) {
  const { data, error } = await supabase.from('reports').select('latitude,longitude')
    .eq('is_sample', false).eq('is_published', true).is('cancelled_at', null)
    .or(completedImpactReportFilter(new Date().toISOString()))
    .not('latitude', 'is', null).not('longitude', 'is', null)
    .order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data || []).filter(point => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
}

export function regionAround(points) {
  if (!points.length) return null;
  const latitudes = points.map(point => point.latitude);
  const longitudes = points.map(point => point.longitude);
  const south = Math.min(...latitudes), north = Math.max(...latitudes);
  const west = Math.min(...longitudes), east = Math.max(...longitudes);
  return {
    latitude: (south + north) / 2,
    longitude: (west + east) / 2,
    latitudeDelta: Math.max(MIN_DELTA, (north - south) * PADDING),
    longitudeDelta: Math.max(MIN_DELTA, (east - west) * PADDING),
  };
}

// The person's spot together with the closest reports: those within twice the distance of
// the nearest one (at least five miles), so a far-off straggler doesn't zoom the map out.
export function nearestReportsRegion(origin, points) {
  if (!origin || !points.length) return null;
  const nearby = points
    .map(point => ({ point, miles: distanceMiles(origin, point) }))
    .filter(({ miles }) => miles != null && miles <= NEAR_MILES)
    .sort((a, b) => a.miles - b.miles);
  if (!nearby.length) return null;
  const reach = Math.max(5, nearby[0].miles * 2);
  const chosen = nearby.filter(({ miles }) => miles <= reach).slice(0, MAX_NEAREST).map(({ point }) => point);
  return regionAround([origin, ...chosen]);
}

// The phone-screen-sized window (a little over three miles each way) holding the most
// reports, framed on exactly those reports so none sit just past the edge.
export function busiestRegion(points) {
  const half = BUSY_WINDOW / 2;
  let best = null;
  for (const center of points) {
    const group = points.filter(point => Math.abs(point.latitude - center.latitude) <= half
      && Math.abs(point.longitude - center.longitude) <= half);
    if (!best || group.length > best.length) best = group;
  }
  if (!best) return null;
  const framed = regionAround(best);
  return {
    ...framed,
    latitudeDelta: Math.max(BUSY_VIEW_DELTA, (framed.latitudeDelta / PADDING) * 1.25),
    longitudeDelta: Math.max(BUSY_VIEW_DELTA, (framed.longitudeDelta / PADDING) * 1.25),
  };
}

export function startingRegion({ origin, points }) {
  return nearestReportsRegion(origin, points) || busiestRegion(points);
}
