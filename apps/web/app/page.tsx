import type { Report } from '@litterbugs/report-contract';

import { MapExperience } from '@/components/map-experience';
import { getGoogleMapsKey, getGoogleMapsMapId } from '@/lib/env';
import { realUserIdFromClaims } from '@/lib/report-access';
import { reportDiscoveryWindow } from '@/lib/report-visibility';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
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
        .order('created_at', { ascending: false }),
    ]);

    userId = realUserIdFromClaims(claimsData?.claims);
    if (reportsResult.error) throw reportsResult.error;
    reports = reportsResult.data ?? [];
  } catch (error) {
    initialError = error instanceof Error ? error.message : 'Reports could not be loaded.';
  }

  return (
    <MapExperience
      initialReports={reports}
      initialUserId={userId}
      googleMapsKey={getGoogleMapsKey()}
      googleMapsMapId={getGoogleMapsMapId()}
      initialError={initialError}
    />
  );
}
