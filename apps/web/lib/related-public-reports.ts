import 'server-only';
import { cache } from 'react';
import { createPublicClient } from './supabase/public';
import { communityBounds, publicCommunityForPoint } from './public-communities';
import { isPubliclyShareableReport, isExpiredPublicReport } from './public-report-share-model';

export type RelatedPublicReport = { id: string; title: string; state: 'available' | 'completed' };

/** One bounded anonymous read; no profiles, image downloads, or coordinates in output. */
export const loadRelatedPublicReports = cache(async (
  reportId: string, communitySlug?: string,
): Promise<RelatedPublicReport[]> => {
  const bounds = communitySlug ? communityBounds(communitySlug) : null;
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
      .order('created_at', { ascending: false }).order('id').limit(24);
    if (error) return [];
    const reports: RelatedPublicReport[] = [];
    for (const row of data ?? []) {
      if (row.id === reportId || !isPubliclyShareableReport(row) || isExpiredPublicReport(row)
        || publicCommunityForPoint(row.latitude, row.longitude)?.slug !== communitySlug
        || (row.cleanup_state !== 'available' && row.cleanup_state !== 'completed')) continue;
      reports.push({ id: row.id, title: row.title?.trim() || 'Litter report', state: row.cleanup_state });
    }
    // Keep both opportunities and evidence visible when present in this recent sample.
    return [
      ...reports.filter(row => row.state === 'available').slice(0, 3),
      ...reports.filter(row => row.state === 'completed').slice(0, 3),
    ];
  } catch {
    // Related links are optional; their outage must not hide the original record.
    return [];
  }
});
