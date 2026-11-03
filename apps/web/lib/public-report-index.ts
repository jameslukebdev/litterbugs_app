import 'server-only';
import { createPublicClient } from '@/lib/supabase/public';
import { isPubliclyShareableReport } from '@/lib/public-report-share-model';

export type PublicReportIndexEntry = {
  id: string;
  hasBeforePhoto: boolean;
  hasAfterPhoto: boolean;
};

export async function loadPublicReportIndex() {
  const supabase = createPublicClient();
  const reports: PublicReportIndexEntry[] = [];
  let afterId: string | undefined;
  for (;;) {
    let query = supabase.from('reports')
      .select('id, title, renewal_status, photo_paths, cleanup_state, cancelled_at, expired_at, expires_at, is_sample, is_published')
      .eq('is_published', true).eq('is_sample', false)
      .order('id').limit(1000);
    if (afterId) query = query.gt('id', afterId);
    const { data, error } = await query;
    // A backend outage should not publish an apparently successful empty sitemap.
    if (error) throw error;
    const visible = data.filter(report => isPubliclyShareableReport(report));
    const afterPhotos = new Set<string>();
    const completedIds = visible.filter(report => report.cleanup_state === 'completed').map(report => report.id);
    // Batch evidence lookups instead of loading every full report/profile/photo.
    for (let start = 0; start < completedIds.length; start += 200) {
      const finalSubmissions = new Map<string, string>();
      for (let offset = 0;; offset += 1000) {
        const { data: attempts, error: attemptError } = await supabase.from('cleanup_attempts')
          .select('id,report_id,final_submission_id')
          .in('report_id', completedIds.slice(start, start + 200))
          .eq('status', 'completed').not('final_submission_id', 'is', null)
          .order('completed_at', { ascending: false }).order('id')
          .range(offset, offset + 999);
        if (attemptError) throw attemptError;
        for (const attempt of attempts) {
          if (attempt.final_submission_id && !finalSubmissions.has(attempt.report_id)) {
            finalSubmissions.set(attempt.report_id, attempt.final_submission_id);
          }
        }
        if (attempts.length < 1000) break;
      }
      if (!finalSubmissions.size) continue;
      const submissionIds = [...finalSubmissions.values()];
      const firstPhoto = new Map<string, boolean>();
      for (let offset = 0;; offset += 1000) {
        const { data: photos, error: photoError } = await supabase.from('cleanup_submission_photos')
          .select('submission_id,storage_path').in('submission_id', submissionIds)
          .order('display_order').order('id').range(offset, offset + 999);
        if (photoError) throw photoError;
        for (const photo of photos) {
          if (!firstPhoto.has(photo.submission_id)) firstPhoto.set(photo.submission_id, Boolean(photo.storage_path));
        }
        if (photos.length < 1000) break;
      }
      for (const [reportId, submissionId] of finalSubmissions) {
        if (firstPhoto.get(submissionId)) afterPhotos.add(reportId);
      }
    }
    reports.push(...visible.map(report => ({
      id: report.id,
      hasBeforePhoto: Boolean(report.photo_paths?.[0]),
      hasAfterPhoto: afterPhotos.has(report.id),
    })));
    if (data.length < 1000) return reports;
    afterId = data[data.length - 1].id;
    if (reports.length >= 49_000) throw new Error('Public report sitemap requires partitioning');
  }
}
