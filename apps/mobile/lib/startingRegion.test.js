import { describe, expect, it, vi } from 'vitest';
vi.mock('./supabase', () => ({ supabase: {} }));
import { busiestRegion, nearestReportsRegion, regionAround, startingRegion } from './startingRegion';

const inside = (region, point) => Math.abs(point.latitude - region.latitude) <= region.latitudeDelta / 2
  && Math.abs(point.longitude - region.longitude) <= region.longitudeDelta / 2;
// Boone, NC, with a few reports nearby, and a lone report in Kansas.
const boone = [
  { latitude: 36.2168, longitude: -81.6746 }, { latitude: 36.2201, longitude: -81.6801 },
  { latitude: 36.2105, longitude: -81.6602 }, { latitude: 36.1801, longitude: -81.7102 },
];
const kansas = { latitude: 39.05, longitude: -95.68 };
const points = [...boone, kansas];

describe('where the map starts for a new person', () => {
  it('opens at street level on the busiest area when the location is unknown', () => {
    const region = startingRegion({ origin: null, points });
    boone.slice(0, 3).forEach(point => expect(inside(region, point)).toBe(true));
    expect(inside(region, kansas)).toBe(false);
    expect(region.latitudeDelta).toBeLessThanOrEqual(0.05);
  });

  it('shows the person with their nearest reports in view', () => {
    const origin = { latitude: 36.25, longitude: -81.70 };
    const region = startingRegion({ origin, points });
    expect(inside(region, origin)).toBe(true);
    expect(boone.some(point => inside(region, point))).toBe(true);
    expect(inside(region, kansas)).toBe(false);
  });

  it('falls back to the busiest area when nothing is near the person', () => {
    const farAway = { latitude: 47.6, longitude: -122.3 };
    expect(nearestReportsRegion(farAway, points)).toBeNull();
    const region = startingRegion({ origin: farAway, points });
    boone.slice(0, 3).forEach(point => expect(inside(region, point)).toBe(true));
  });

  it('never zooms tighter than a neighborhood, and keeps the default with no reports', () => {
    expect(regionAround([kansas]).latitudeDelta).toBeGreaterThanOrEqual(0.06);
    expect(busiestRegion([])).toBeNull();
    expect(startingRegion({ origin: kansas, points: [] })).toBeNull();
  });
});
