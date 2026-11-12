import { withCompletedRewards } from './completedRewards';
import { supabase } from './supabase';
import { collectReportMatches } from './collectReportMatches';
import { matchesReportFilters } from './reportFilters';
import { matchesGeography } from './searchGeography';
import { completedImpactReportFilter } from './reportVisibility';
import { MAP_REPORT_LIMIT } from './mapWorkBudget';
export const REPORT_SELECT = `
  *,
  reporter:profiles!reports_user_id_fkey(
    id,
    display_name,
    username,
    provider_avatar_url,
    avatar_path,
    updated_at
  )
`;

export async function loadDiscoveryReports({ area, filters, searchPlace, blockedIds = [], favoriteIds = [], hiddenIds = [], signal, includeNearby = false }) {
      // The map also keeps a full screen of reports on every side of the view (see below).
      const reach = includeNearby ? 1.5 : 1;
      const latitudeSpan = Math.max(area.latitudeDelta * reach, filters.radius / 69);
      const longitudeSpan = Math.max(area.longitudeDelta * reach, filters.radius / (69 * Math.max(0.01, Math.cos(area.latitude * Math.PI / 180))));
      const blocked = new Set(blockedIds);
      // Fetch a bounded area in stable pages; never silently accept the API's row cap.
      const nowIso = new Date().toISOString();
      const fetchPage = async (offset, pageSize) => {
        let query = supabase.from('reports').select(REPORT_SELECT)
          .eq('is_sample', false).eq('is_published', true).is('cancelled_at', null)
          .or(completedImpactReportFilter(nowIso))
          .gte('latitude', Math.max(-90, area.latitude - latitudeSpan))
          .lte('latitude', Math.min(90, area.latitude + latitudeSpan));
        const west = area.longitude - longitudeSpan;
        const east = area.longitude + longitudeSpan;
        if (west >= -180 && east <= 180) query = query.gte('longitude', west).lte('longitude', east);
        if (filters.status === 'available') query = query.eq('cleanup_state', 'available');
        if (filters.status === 'completed') query = query.eq('cleanup_state', 'completed');
        if (filters.status === 'progress') query = query.in('cleanup_state', ['claimed', 'completion_submitted', 'changes_requested']);
        if (filters.status === 'available' && filters.funding === 'funded') query = query.gt('funded_amount_cents', 0);
        if (filters.status === 'available' && filters.funding === 'volunteer') query = query.or('funded_amount_cents.lte.0,funded_amount_cents.is.null');
        if (filters.severity !== 'all') query = query.ilike('severity', filters.severity);
        const { data, error: reportsError } = await query.order('created_at', { ascending: false }).order('id').range(offset, offset + pageSize - 1).abortSignal(signal);
        if (signal?.aborted) throw new Error('Obsolete discovery request');
        if (reportsError) throw reportsError;
        return withCompletedRewards(data || []);
      };
      const accepts = within => report => !blocked.has(report.user_id) && matchesReportFilters(report, filters, area, favoriteIds, hiddenIds) && matchesGeography(report, within, searchPlace);
      if (!includeNearby) return collectReportMatches(fetchPage, accepts(area), { limit: MAP_REPORT_LIMIT });
      // For the map, keep the reports around the view as well (the whole fetched area), so pins
      // are already there to land the moment the map is swiped; the map only draws the ones in
      // view. Where that is more than the budget, keep only the view, as before.
      const around = { ...area, latitudeDelta: latitudeSpan * 2, longitudeDelta: longitudeSpan * 2 };
      const nearby = await collectReportMatches(fetchPage, accepts(around), { limit: MAP_REPORT_LIMIT });
      if (!nearby.truncated) return { reports: nearby.reports, truncated: false };
      return collectReportMatches(fetchPage, accepts(area), { limit: MAP_REPORT_LIMIT });
}
