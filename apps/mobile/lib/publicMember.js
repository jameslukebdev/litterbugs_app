import { supabase } from './supabase';
import { PUBLIC_PROFILE_FIELDS } from './publicProfileFields';
import { applyHistoryCursor, historyPage, HISTORY_PAGE_SIZE } from './historyPagination';

export async function loadPublicMember(profileId) {
  if (!profileId) return null;
  const { data, error } = await supabase.from('profiles').select(PUBLIC_PROFILE_FIELDS).eq('id', profileId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function loadPublicMemberReports({ profileId, view = 'active', cursor = null }) {
  if (!profileId) return historyPage();
  let query = supabase.from('reports')
    .select('id,user_id,title,severity,cleanup_state,created_at')
    .eq('user_id', profileId).eq('is_sample', false).is('cancelled_at', null);
  if (view === 'completed') query = query.eq('cleanup_state', 'completed');
  else query = query.in('cleanup_state', ['available', 'claimed', 'completion_submitted', 'changes_requested'])
    .is('expired_at', null).or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
  query = applyHistoryCursor(query, cursor);
  const { data, error } = await query.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(HISTORY_PAGE_SIZE + 1);
  if (error) throw error;
  return historyPage(data ?? []);
}
