import { createClient } from './supabase/client';

/** Match the saved submission identity, never a title or nearby location. */
export async function isReportPublished(userId: string, reportId: string): Promise<boolean> {
  const { data, error } = await createClient().from('reports')
    .select('id').eq('id', reportId).eq('user_id', userId).eq('is_published', true)
    .abortSignal(AbortSignal.timeout(8000)).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
