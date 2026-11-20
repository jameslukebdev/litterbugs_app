'use client';

import { createClient } from '@/lib/supabase/client';
import type { ContributorCredit, DonorContribution } from './contributor-credit';

export async function loadContributorCredits(reportIds: string[]): Promise<ContributorCredit[]> {
  try {
    const { data, error } = await createClient().rpc('cleanup_contributor_credits', { report_ids: reportIds });
    if (!error) return (data ?? []).map(row => ({ ...row, donations: row.donations as DonorContribution[] }));
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined'
      && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) {
      const response = await fetch('/api/local/contributor-credits', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
        body: JSON.stringify({ report_ids: reportIds }),
      });
      if (response.ok) return await response.json();
    }
  } catch { /* An unavailable donor reader must not prevent reports from loading. */ }
  return [];
}
