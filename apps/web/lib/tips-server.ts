import 'server-only';
import { createPublicClient } from '@/lib/supabase/public';

type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
const rpc: Rpc = (name, args) => (createPublicClient() as unknown as { rpc: Rpc }).rpc(name, args);

export type TipRecipient = {
  name: string;
  avatar_path: string | null;
  provider_avatar_url: string | null;
  updated_at: string;
  rank_points: number;
  cleanups: number;
  can_receive_tips: boolean;
};

const profileId = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

/** Who the tip page is for, in the same privacy-preserving form as the leaderboard (e.g. "Grant G."). */
export async function loadTipRecipient(id: string): Promise<TipRecipient | null> {
  if (!profileId.test(id)) return null;
  const { data, error } = await rpc('tip_recipient', { target_profile_id: id });
  if (error) throw new Error('This tip page could not be loaded. Please try again.');
  return (Array.isArray(data) ? data[0] : data) as TipRecipient ?? null;
}

/** Tip links for the leaderboard: only cleaners who can be paid right now get a Tip button. */
export async function leaderboardTipLinks(profileIds: readonly string[]): Promise<Record<string, string>> {
  const ids = [...new Set(profileIds.filter(id => profileId.test(id)))].slice(0, 200);
  if (!ids.length) return {};
  const { data, error } = await rpc('tip_eligible_profiles', { profile_ids: ids });
  if (error || !Array.isArray(data)) return {};
  return Object.fromEntries(data.map(row => {
    const id = typeof row === 'string' ? row : (row as Record<string, string>).tip_eligible_profiles;
    return [id, `/tip/${id}`];
  }).filter(([id]) => profileId.test(id)));
}
