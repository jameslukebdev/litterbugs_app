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

export async function loadDiscoveryReports({ area, filters, searchPlace, blockedIds = [], signal }) {
      const latitudeSpan = Math.max(area.latitudeDelta, filters.radius / 69);
      const longitudeSpan = Math.max(area.longitudeDelta, filters.radius / (69 * Math.max(0.01, Math.cos(area.latitude * Math.PI / 180))));
      const blocked = new Set(blockedIds);
      // Fetch a bounded area in stable pages; never silently accept the API's row cap.
      const nowIso = new Date().toISOString();
      return collectReportMatches(async (offset, pageSize) => {
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
        if (filters.funding === 'funded') query = query.gt('funded_amount_cents', 0);
        if (filters.funding === 'volunteer') query = query.or('funded_amount_cents.lte.0,funded_amount_cents.is.null');
        if (filters.severity !== 'all') query = query.ilike('severity', filters.severity);
        const { data, error: reportsError } = await query.order('created_at', { ascending: false }).order('id').range(offset, offset + pageSize - 1).abortSignal(signal);
        if (signal?.aborted) throw new Error('Obsolete discovery request');
        if (reportsError) throw reportsError;
        return data || [];
      }, report => !blocked.has(report.user_id) && matchesReportFilters(report, filters, area) && matchesGeography(report, area, searchPlace), { limit: MAP_REPORT_LIMIT });
}
