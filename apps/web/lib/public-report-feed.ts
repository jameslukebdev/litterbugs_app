import 'server-only';
import { cache } from 'react';
import { collectCommunityPage, communityFeedStateMatches } from './community-feed-page';
import { createPublicClient } from './supabase/public';
import { reportDiscoveryWindow } from './report-visibility';
import { loadPublicReportShare } from './public-report-share';
import { communityBounds, publicCommunityForPoint } from './public-communities';
import type { PublicReportShareModel } from './public-report-share-model';

export type PublicFeed = {
  reports: PublicReportShareModel[];
  hasMore: boolean;
  unavailable: boolean;
};
// Request-scoped caching only: withdrawals are checked again on later requests.
export const loadPublicReportFeed = cache(
  async (
    kind: 'history' | 'recent' | 'open' | 'available' | 'completed' | 'fundable',
    limit = 3,
    page = 1,
    communitySlug = '',
  ): Promise<PublicFeed> => {
    try {
      const size = Math.min(24, Math.max(1, limit));
      const bounds = communitySlug ? communityBounds(communitySlug) : null;
      if (communitySlug && !bounds)
        return { reports: [], hasMore: false, unavailable: false };
      const client = createPublicClient();
      function buildQuery() {
        let query = client
          .from('reports')
          .select('id,latitude,longitude')
          .eq('is_published', true)
          .eq('is_sample', false)
          .order('created_at', { ascending: false })
          .order('id');
        if (kind === 'history') query = query.eq('cleanup_state', 'available').or(`expired_at.not.is.null,expires_at.lte.${new Date().toISOString()}`);
        else query = query.is('cancelled_at', null).is('expired_at', null).or(kind === 'open' ? `${reportDiscoveryWindow()},expires_at.is.null` : reportDiscoveryWindow());
        if (kind === 'open') query = query.in('cleanup_state', ['available', 'claimed', 'completion_submitted', 'changes_requested']);
        if (kind === 'completed') query = query.eq('cleanup_state', 'completed');
        if (kind === 'available' || kind === 'fundable')
          query = query.eq('cleanup_state', 'available');
        if (kind === 'fundable')
          query = query
            .eq('funding_eligibility', 'eligible')
            .is('funding_locked_at', null);
        if (bounds)
          query = query
            .gte('latitude', bounds.south)
            .lte('latitude', bounds.north)
            .gte('longitude', bounds.west)
            .lte('longitude', bounds.east);
        return query;
      }
      if (bounds || kind === 'open' || kind === 'history') {
        const local = await collectCommunityPage(
          async (offset, count) => {
            const { data, error } = await buildQuery().range(offset, offset + count - 1);
            if (error) throw error;
            return data ?? [];
          },
          row => !bounds || publicCommunityForPoint(row.latitude, row.longitude)?.slug === communitySlug,
          async row => {
            const model = await loadPublicReportShare(row.id, 'linked');
            return model && communityFeedStateMatches(kind, model.state, model.fundingEligible) ? model : null;
          },
          size, Math.max(1, Math.min(1000, page)),
        );
        return { ...local, unavailable: false };
      }
      const start = (Math.max(1, Math.min(1000, page)) - 1) * size;
      const { data, error } = await buildQuery().range(start, start + size);
      if (error) throw error;
      const eligible = data ?? [];
      const models = await Promise.all(
        eligible
          .slice(0, size)
          .map((row) => loadPublicReportShare(row.id, 'linked')),
      );
      return {
        reports: models.filter(
          (item): item is PublicReportShareModel => !!item && communityFeedStateMatches(kind, item.state, item.fundingEligible),
        ),
        hasMore: eligible.length > size,
        unavailable: false,
      };
    } catch {
      return { reports: [], hasMore: false, unavailable: true };
    }
  },
);
