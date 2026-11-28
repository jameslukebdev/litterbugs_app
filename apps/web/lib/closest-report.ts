import { getDistanceMiles, type Coordinates, type MappableReport } from '@litterbugs/report-contract';
import { loadDiscoveryReports, type DiscoveryArea, type DiscoveryFilters } from './report-discovery';
import type { createClient } from './supabase/client';

/** A spherical bounding box containing every point within the requested distance. */
export function closestSearchArea(center: Coordinates, miles: number): DiscoveryArea {
  const angle = miles / 3958.7613;
  const degrees = angle * 180 / Math.PI;
  const south = Math.max(-90, center.latitude - degrees), north = Math.min(90, center.latitude + degrees);
  const longitudeDelta = south <= -90 || north >= 90 ? 180
    : Math.asin(Math.min(1, Math.sin(angle) / Math.cos(center.latitude * Math.PI / 180))) * 180 / Math.PI;
  const wrap = (longitude: number) => ((longitude + 180) % 360 + 360) % 360 - 180;
  return { ...center, south, north, west: longitudeDelta >= 180 ? -180 : wrap(center.longitude - longitudeDelta), east: longitudeDelta >= 180 ? 180 : wrap(center.longitude + longitudeDelta) };
}

export type ClosestReport = { report: MappableReport; miles: number };

/** Complete each search ring before choosing a result: newest-first caps cannot prove proximity. */
export async function findClosestReport(client: ReturnType<typeof createClient>, {
  center, filters, favorites, hidden, signal, excludeReportId,
}: { center: Coordinates; filters: DiscoveryFilters; favorites: ReadonlySet<string>; hidden: ReadonlySet<string>; signal: AbortSignal; excludeReportId?: string }): Promise<ClosestReport | null> {
  if (!Number.isFinite(center.latitude) || !Number.isFinite(center.longitude)) throw new Error('Map location unavailable');
  const searchFilters = { ...filters, radius: 0 as const };
  for (const radius of [25, 100, 500, 2000, 12500]) {
    if (signal.aborted) throw new Error('Search cancelled');
    const { reports } = await loadDiscoveryReports(client, {
      filters: searchFilters, area: closestSearchArea(center, radius), favorites, hidden, signal,
      // Exhaust pages in the ring; an arbitrary result limit can hide the closest match.
      limit: Infinity,
    });
    let closest: ClosestReport | null = null;
    for (const report of reports) {
      if (report.id === excludeReportId) continue;
      const miles = getDistanceMiles(center, report);
      if (miles <= radius && (!closest || miles < closest.miles)) closest = { report, miles };
    }
    if (closest) return closest;
  }
  return null;
}
