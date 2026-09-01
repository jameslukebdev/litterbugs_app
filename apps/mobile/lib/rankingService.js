import {
  getPendingRankCelebration,
  getRankingSummary,
} from './ranking';
import { supabase } from './supabase';

export async function loadRanking(userId, client = supabase) {
  if (!userId) throw new TypeError('A user ID is required to load ranking data.');

  const { data, error } = await client.rpc('get_rank_points', {
    target_user_id: userId,
  });

  if (error) throw error;
  return getRankingSummary(data);
}

export async function loadPendingRankCelebration(
  userId,
  celebratedThroughPoints,
  client = supabase,
) {
  const ranking = await loadRanking(userId, client);

  return {
    ranking,
    pendingRank: getPendingRankCelebration(
      celebratedThroughPoints,
      ranking.points,
    ),
  };
}

export async function acknowledgeCurrentRank(client = supabase) {
  const { data, error } = await client.rpc('acknowledge_current_rank');
  if (error) throw error;
  return Number(data);
}
