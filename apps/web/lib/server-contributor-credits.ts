import 'server-only';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { headers } from 'next/headers';
import { createPublicClient } from '@/lib/supabase/public';
import { withContributorCredits, type ContributorCredit, type DonorContribution } from './contributor-credit';
import { isPubliclyShareableReport } from './public-report-share-model';
import { readLocalDonationCredits } from './local-contribution-privacy';

export async function readLocalContributorCredits(ids: string[]): Promise<ContributorCredit[]> {
  if (process.env.NODE_ENV !== 'development' || process.env.VERCEL === '1') return [];
  const host = (await headers()).get('host');
  if (!host || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(`http://${host}`).hostname)) return [];
  const source: unknown = await readLocalDonationCredits().catch(async error => {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    return JSON.parse(await readFile(join(tmpdir(), 'litterbugs-contributor-credits', 'credits.json'), 'utf8'));
  });
  if (!Array.isArray(source)) return [];
  const { data, error } = await createPublicClient().from('reports').select('*').in('id', ids);
  if (error) throw error;
  const visible = new Set(data.filter(report => isPubliclyShareableReport(report)).map(report => report.id));
  return source.filter((row): row is ContributorCredit => row && typeof row === 'object'
    && visible.has(row.report_id) && Array.isArray(row.names) && row.names.every((name: unknown) => typeof name === 'string')
    && Number.isInteger(row.anonymous_count) && row.anonymous_count >= 0
    && Array.isArray(row.donations) && row.donations.every((donation: DonorContribution) => donation
      && (donation.name === null || typeof donation.name === 'string') && Number.isInteger(donation.amountCents)
      && donation.amountCents > 0 && typeof donation.donatedAt === 'string' && Number.isFinite(Date.parse(donation.donatedAt))))
    .map(({ report_id, names, anonymous_count, donations }) => ({ report_id, names, anonymous_count, donations }));
}

export function withServerContributorCredits<T extends { id: string }>(reports: T[]) {
  return withContributorCredits(reports, async ids => {
    try {
      const { data, error } = await createPublicClient().rpc('cleanup_contributor_credits', { report_ids: ids });
      if (!error) return (data ?? []).map(row => ({ ...row, donations: row.donations as DonorContribution[] }));
      return await readLocalContributorCredits(ids);
    } catch { return []; }
  });
}
