import { supabase } from './supabase';

// Later corrections must not replace a cleanup's original before evidence.
export async function claimedReportPhotoPaths(attempt, fallback = []) {
  if (!attempt?.report_content_revision) return fallback;
  const { data, error } = await supabase.from('report_content_revisions').select('photo_paths')
    .eq('report_id', attempt.report_id).eq('revision', attempt.report_content_revision).maybeSingle();
  if (error) throw error;
  return data?.photo_paths || fallback;
}
