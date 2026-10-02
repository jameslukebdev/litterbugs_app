import type { Report } from '@litterbugs/report-contract';
import { createClient } from '@/lib/supabase/client';
import { isReportClosed } from '@/lib/report-visibility';

/** Matches mobile personal activity: independent of discovery filters and lifetime counters. */
export async function loadAccountReports(userId: string) {
  const rows: Report[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await createClient().from('reports').select('*')
      .eq('user_id', userId).eq('is_sample', false).eq('is_published', true)
      .order('created_at', { ascending: false }).order('id').range(offset, offset + 499);
    if (error) return { data: null, error };
    rows.push(...(data ?? []));
    if (!data || data.length < 500) return { data: rows, error: null };
  }
}

export function accountReportStatus(report: Report, now = Date.now()) {
  if (isReportClosed(report, now)) return 'Closed';
  if (report.cleanup_state === 'completed') return 'Completed';
  return 'Active';
}

export async function loadAccountPages<T>(fetchPage: (start: number, end: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await fetchPage(offset, offset + 499);
    if (error) return { data: null, error };
    rows.push(...(data ?? []));
    if (!data || data.length < 500) return { data: rows, error: null };
  }
}
