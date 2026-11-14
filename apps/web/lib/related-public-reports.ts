import 'server-only';
import { cache } from 'react';
import { createPublicClient } from './supabase/public';
import { communityBounds, publicCommunityForPoint } from './public-communities';
import { LIST_TOWN_WAIT_MS, publicReportPlace } from './public-report-place';
import { isPubliclyShareableReport, isExpiredPublicReport } from './public-report-share-model';
import { publicReportPath } from './public-report-url';

export type RelatedPublicReport = {
  id: string; title: string; state: 'available' | 'completed';
  /** Readable public address. */
  path: string;
  /** Straight-line distance from the report being viewed, when that report's position is known. */
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
 * Other public reports to read next. With the viewed report's position they
 * are the nearest ones, wherever it is; without it, the older behaviour of
 * recent reports in the same editorial community. One bounded anonymous read;
 * no profiles or image downloads.
 */
export const loadRelatedPublicReports = cache(async (
  reportId: string, communitySlug?: string, latitude?: number | null, longitude?: number | null,
): Promise<RelatedPublicReport[]> => {
  const origin = latitude != null && longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { latitude, longitude } : null;
  const span = NEARBY_MILES / MILES_PER_DEGREE;
  const bounds = origin
    ? { south: origin.latitude - span, north: origin.latitude + span,
      west: origin.longitude - span / Math.max(0.2, Math.cos(origin.latitude * Math.PI / 180)),
      east: origin.longitude + span / Math.max(0.2, Math.cos(origin.latitude * Math.PI / 180)) }
    : communitySlug ? communityBounds(communitySlug) : null;
  if (!bounds) return [];
  try {
    const { data, error } = await createPublicClient().from('reports')
      .select('id,title,latitude,longitude,cleanup_state,is_published,is_sample,cancelled_at,expired_at,expires_at')
      .neq('id', reportId)
      .eq('is_published', true).eq('is_sample', false)
      .is('cancelled_at', null).is('expired_at', null)
      .in('cleanup_state', ['available', 'completed'])
      .gte('latitude', bounds.south).lte('latitude', bounds.north)
      .gte('longitude', bounds.west).lte('longitude', bounds.east)
      .order('created_at', { ascending: false }).order('id').limit(origin ? 60 : 24);
    if (error) return [];
    const reports: (RelatedPublicReport & { latitude: number | null; longitude: number | null })[] = [];
    for (const row of data ?? []) {
      const community = publicCommunityForPoint(row.latitude, row.longitude);
      if (row.id === reportId || !isPubliclyShareableReport(row) || isExpiredPublicReport(row)
        || (!origin && community?.slug !== communitySlug)
        || (row.cleanup_state !== 'available' && row.cleanup_state !== 'completed')) continue;
      const miles = origin && row.latitude != null && row.longitude != null
        ? milesBetween(origin, { latitude: row.latitude, longitude: row.longitude }) : undefined;
      if (origin && (miles === undefined || miles > NEARBY_MILES)) continue;
      reports.push({ id: row.id, title: row.title?.trim() || 'Litter report', state: row.cleanup_state,
        path: publicReportPath(row.id, row.title?.trim() || 'Litter Report', community?.localityLabel),
        ...(miles === undefined ? {} : { miles }), latitude: row.latitude, longitude: row.longitude });
    }
    // Keep both opportunities and evidence visible: the nearest (or most recent) three of each.
    if (origin) reports.sort((a, b) => (a.miles ?? 0) - (b.miles ?? 0));
    const chosen = [
      ...reports.filter(row => row.state === 'available').slice(0, 3),
      ...reports.filter(row => row.state === 'completed').slice(0, 3),
    ];
    return Promise.all(chosen.map(async ({ latitude: lat, longitude: lng, ...report }) => {
      // Outside an editorial community the address still carries the town, when it is already known.
      if (!origin || publicCommunityForPoint(lat, lng)) return report;
      const place = await publicReportPlace(lat, lng, LIST_TOWN_WAIT_MS);
      return place ? { ...report, path: publicReportPath(report.id, report.title, place.localityLabel) } : report;
    }));
  } catch {
    // Related links are optional; their outage must not hide the original record.
    return [];
  }
});
