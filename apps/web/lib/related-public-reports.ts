import 'server-only';
import { cache } from 'react';
import { createPublicClient } from './supabase/public';
import { LIST_TOWN_WAIT_MS, publicReportPlace } from './public-report-place';
import { loadReportCommunities } from './report-communities';
import { isPubliclyShareableReport, isExpiredPublicReport } from './public-report-share-model';
import { publicReportPath } from './public-report-url';

export type RelatedPublicReport = {
  id: string; title: string; state: 'available' | 'completed';
  /** Readable public address. */
  path: string;
  /** Straight-line distance from the report being viewed. */
  miles?: number;
};

/** Nearby means within about this many miles; the search box is cut to a circle afterwards. */
const NEARBY_MILES = 15;
const MILES_PER_DEGREE = 69;

function milesBetween(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const x = radians(b.longitude - a.longitude) * Math.cos(radians((a.latitude + b.latitude) / 2));
  return 3958.8 * Math.hypot(x, radians(b.latitude - a.latitude));
}

/**
 * Other public reports to read next: the nearest ones to the report being viewed, wherever it is.
 * One bounded anonymous read; no profiles or image downloads. Without a position there is nothing to
 * be near, so the page shows its general links instead.
 */
export const loadRelatedPublicReports = cache(async (
  reportId: string, latitude?: number | null, longitude?: number | null,
): Promise<RelatedPublicReport[]> => {
  if (latitude == null || longitude == null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
  const origin = { latitude, longitude };
  const span = NEARBY_MILES / MILES_PER_DEGREE;
  const lngSpan = span / Math.max(0.2, Math.cos(origin.latitude * Math.PI / 180));
  try {
    const { data, error } = await createPublicClient().from('reports')
      .select('id,title,latitude,longitude,cleanup_state,is_published,is_sample,cancelled_at,expired_at,expires_at')
      .neq('id', reportId)
      .eq('is_published', true).eq('is_sample', false)
      .is('cancelled_at', null).is('expired_at', null)
      .in('cleanup_state', ['available', 'completed'])
      .gte('latitude', origin.latitude - span).lte('latitude', origin.latitude + span)
      .gte('longitude', origin.longitude - lngSpan).lte('longitude', origin.longitude + lngSpan)
      .order('created_at', { ascending: false }).order('id').limit(60);
    if (error) return [];
    const reports: (RelatedPublicReport & { latitude: number; longitude: number })[] = [];
    for (const row of data ?? []) {
      if (row.id === reportId || !isPubliclyShareableReport(row) || isExpiredPublicReport(row)
        || (row.cleanup_state !== 'available' && row.cleanup_state !== 'completed')
        || row.latitude == null || row.longitude == null) continue;
      const miles = milesBetween(origin, { latitude: row.latitude, longitude: row.longitude });
      if (miles > NEARBY_MILES) continue;
      reports.push({ id: row.id, title: row.title?.trim() || 'Litter report', state: row.cleanup_state,
        path: publicReportPath(row.id, row.title?.trim() || 'Litter Report'), miles, latitude: row.latitude, longitude: row.longitude });
    }
    // Keep both opportunities and evidence visible: the nearest three of each.
    reports.sort((a, b) => (a.miles ?? 0) - (b.miles ?? 0));
    const chosen = [
      ...reports.filter(row => row.state === 'available').slice(0, 3),
      ...reports.filter(row => row.state === 'completed').slice(0, 3),
    ];
    const communities = await loadReportCommunities(chosen.map(row => row.id)).catch(() => new Map());
    return Promise.all(chosen.map(async ({ latitude: lat, longitude: lng, ...report }) => {
      // The address carries the town when it is already known, exactly as on the report's own page.
      const place = await publicReportPlace(lat, lng, LIST_TOWN_WAIT_MS, communities.get(report.id));
      return place ? { ...report, path: publicReportPath(report.id, report.title, place.localityLabel) } : report;
    }));
  } catch {
    // Related links are optional; their outage must not hide the original record.
    return [];
  }
});
