import 'server-only';
import { LIST_TOWN_WAIT_MS, publicReportPlace } from './public-report-place';
import { loadReportCommunity } from './report-communities';
import { isPubliclyShareableReport } from './public-report-share-model';
import { isPublicReportPagePath, publicReportIdFromPath, publicReportPath, publicReportPathHasTitle } from './public-report-url';
import { createPublicClient } from './supabase/public';

export type PublicReportRoute =
  | { kind: 'pass' }
  | { kind: 'missing' }
  | { kind: 'redirect'; path: string };

/**
 * Decides, before a report page starts streaming, whether the address is the
 * report's current readable one, an older form to redirect, or a report that
 * is not public. Once the page streams its status is fixed at 200, so a real
 * 404 and a real redirect can only come from here.
 *
 * A failed lookup passes the request through: the page then makes the same
 * checks itself, and an outage never turns a live report into a 404.
 */
export async function resolvePublicReportRoute(pathname: string): Promise<PublicReportRoute> {
  if (!isPublicReportPagePath(pathname)) return { kind: 'pass' };
  const id = publicReportIdFromPath(pathname);
  if (!id) return { kind: 'missing' };
  try {
    const { data, error } = await createPublicClient().from('reports')
      .select('id, title, latitude, longitude, renewal_status, cleanup_state, cancelled_at, expired_at, expires_at, is_sample, is_published')
      .eq('id', id).eq('is_sample', false).eq('is_published', true).maybeSingle();
    if (error) return { kind: 'pass' };
    if (!data || !isPubliclyShareableReport(data)) return { kind: 'missing' };
    const title = data.title?.trim() || 'Litter Report';
    const place = await publicReportPlace(data.latitude, data.longitude, LIST_TOWN_WAIT_MS, await loadReportCommunity(data.id));
    const path = publicReportPath(data.id, title, place?.localityLabel);
    // The town words come from a lookup that may not have answered yet, so an address with the
    // right title and id is served as it is; the page's canonical tag names the full address.
    return path === pathname || publicReportPathHasTitle(pathname, data.id, title) ? { kind: 'pass' } : { kind: 'redirect', path };
  } catch {
    return { kind: 'pass' };
  }
}
