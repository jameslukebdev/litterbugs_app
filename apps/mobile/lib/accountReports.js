import { supabase } from './supabase';

// Personal activity must never depend on the discovery viewport or its filters.
export async function loadAccountReports(userId) {
  if (!userId) return [];
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('reports')
      .select('id,user_id,title,severity,cleanup_state,created_at,expires_at,expired_at,cancelled_at')
      .eq('user_id', userId).eq('is_sample', false)
      .order('created_at', { ascending: false }).order('id')
      .range(offset, offset + 499);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 500) return rows;
  }
}

export function groupAccountReports(reports, now = Date.now()) {
  return reports.reduce((groups, report) => {
    const closed = report.cancelled_at || report.expired_at ||
      (report.expires_at && Date.parse(report.expires_at) <= now);
    groups[report.cleanup_state === 'completed' ? 'completed' : closed ? 'closed' : 'active'].push(report);
    return groups;
  }, { active: [], completed: [], closed: [] });
}
