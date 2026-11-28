import { supabase } from './supabase';
import { withTimeout } from './asyncTimeout';

// Only the public, sanitized RPC can read funders. Never query the private ledger
// for somebody else's donations or derive an identity from a billing email.
export async function loadContributorCredit(reportId) {
  if (!reportId) return null;
  const { data, error } = await withTimeout(
    supabase.rpc('cleanup_contributor_credits', { report_ids: [reportId] }),
    12000, 'Donations could not be loaded.',
  );
  if (error) throw error;
  return data?.find(row => row.report_id === reportId) ?? null;
}

export function donationTimeAgo(value, now = Date.now()) {
  const elapsed = Math.max(0, now - Date.parse(value));
  if (!Number.isFinite(elapsed)) return '';
  if (elapsed < 60000) return 'Just now';
  // Hermes in the published apps does not provide Intl.RelativeTimeFormat.
  // Match the English website wording without adding a native dependency.
  const units = [['year', 365 * 86400000], ['month', 30 * 86400000], ['day', 86400000], ['hour', 3600000], ['minute', 60000]];
  const [unit, size] = units.find(([, size]) => elapsed >= size);
  const count = Math.floor(elapsed / size);
  return `${count} ${unit}${count === 1 ? '' : 's'} ago`;
}

// null is the original public-by-default behavior, including older contributions.
export const contributorNameShown = value => value !== false;

export async function setContributorVisibility(contributionId, shown) {
  const { data, error } = await withTimeout(supabase.rpc('set_cleanup_contributor_visibility', {
    contribution_id: contributionId, show_name: shown,
  }), 12000, 'Your name preference could not be saved. Please retry.');
  if (error || data !== true) throw new Error('Your name preference could not be saved. Please retry.');
  return shown;
}

// A reservation may have succeeded even if its response was lost. Its saved
// choice wins over the checkbox on retry; a legacy reservation remains public.
export function savedContributorVisibility(attempt, contribution) {
  if (contribution) return contributorNameShown(contribution.show_contributor_name);
  if (attempt?.intent && 'showContributorName' in attempt.intent) return contributorNameShown(attempt.intent.showContributorName);
  return contributorNameShown(attempt?.showContributorName);
}
