import 'server-only';
import { cache } from 'react';
import { createPublicClient } from './supabase/public';
import { loadPublicReportShare } from './public-report-share';

/** Completion order, not report creation order. All reads retain anonymous RLS. */
export const loadLatestCleanup = cache(async () => {
  const seen = new Set<string>();
  const batchSize = 24;
  try {
    for (let offset = 0; ; offset += batchSize) {
      const { data, error } = await createPublicClient()
        .from('cleanup_attempts')
        .select('report_id, completed_at')
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .not('final_submission_id', 'is', null)
        .order('completed_at', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + batchSize - 1);
      if (error) throw error;
      for (const attempt of data ?? []) {
        if (seen.has(attempt.report_id)) continue;
        seen.add(attempt.report_id);
        const report = await loadPublicReportShare(attempt.report_id, 'linked');
        if (report?.state === 'completed' && report.completionDate && report.beforePhotoUrl && report.afterPhotoUrl) return report;
      }
      if (!data || data.length < batchSize) return null;
    }
  } catch {
    return null;
  }
});
