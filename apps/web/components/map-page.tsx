import { communityReturnPath } from '@/lib/community-journey';
import { communityMapPlace } from '@/lib/community-map-place';
import type { Report } from '@litterbugs/report-contract';

import { withCompletedRewards } from '@/lib/cleanup-reward';
import { MapExperience } from '@/components/map-experience';
import { getGoogleMapsKey, getGoogleMapsMapId } from '@/lib/env';
import { realUserIdFromClaims } from '@/lib/report-access';
import { reportDiscoveryWindow } from '@/lib/report-visibility';
import { createClient } from '@/lib/supabase/server';

export default async function MapPage({ searchParams, initialView }: { searchParams?: Promise<{ area?: string | string[]; returnTo?: string | string[] }>; initialView?: 'map' }) {
  const params = await searchParams;
  const initialPlace = communityMapPlace(params?.area);
  const returnToCommunity = communityReturnPath(params?.returnTo);
  let reports: Report[] = [];
  let userId: string | null = null;
  let initialError = '';

  try {
    const supabase = await createClient();
    const [{ data: claimsData }, reportsResult] = await Promise.all([
      supabase.auth.getClaims(),
      supabase
        .from('reports')
        .select('*')
        .eq('is_sample', false)
          .eq('is_published', true)
        .is('cancelled_at', null)
        .is('expired_at', null)
        .or(reportDiscoveryWindow())
        .order('created_at', { ascending: false }).order('id').limit(500),
    ]);

    userId = realUserIdFromClaims(claimsData?.claims);
    if (reportsResult.error) throw reportsResult.error;
    reports = await withCompletedRewards(supabase, reportsResult.data ?? []);
  } catch (error) {
    initialError = error instanceof Error ? error.message : 'Reports could not be loaded.';
  }

  return (
    <MapExperience
      initialView={initialView}
      initialReports={reports}
      initialPlace={initialPlace}
      returnToCommunity={returnToCommunity}
      initialUserId={userId}
      googleMapsKey={getGoogleMapsKey()}
      googleMapsMapId={getGoogleMapsMapId()}
      initialError={initialError}
    />
  );
}
