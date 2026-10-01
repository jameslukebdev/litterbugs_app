import { supabase } from './supabase';
export const reportRewardCents = report => report.cleanup_state === 'completed' ? report.completedRewardCents : report.funded_amount_cents;
export async function withCompletedRewards(reports) {
  const ids = reports.filter(report => report.cleanup_state === 'completed').map(report => report.id);
  if (!ids.length) return reports;
  const rewards = new Map();
  for (let start = 0; start < ids.length; start += 100) {
    const { data, error } = await supabase.from('cleanup_attempts').select('report_id,is_paid,reward_amount_cents,completed_at')
      .in('report_id', ids.slice(start, start + 100)).eq('status', 'completed').order('completed_at', { ascending: false });
    if (error) throw error;
    for (const attempt of data || []) if (!rewards.has(attempt.report_id)) rewards.set(attempt.report_id, attempt.is_paid ? attempt.reward_amount_cents : 0);
  }
  return reports.map(report => report.cleanup_state === 'completed' ? { ...report, completedRewardCents: rewards.get(report.id) ?? null } : report);
}
