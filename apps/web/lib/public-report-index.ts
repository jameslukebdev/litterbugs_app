import 'server-only';
import { createPublicClient } from '@/lib/supabase/public';
import { LIST_TOWN_WAIT_MS, publicReportPlace } from '@/lib/public-report-place';
import { isPubliclyShareableReport } from '@/lib/public-report-share-model';
import { publicReportPath } from '@/lib/public-report-url';

export type PublicReportIndexEntry = {
  id: string;
  /** The report's readable public address, e.g. /litter-reports/<title>-<town>-<id>. */
  path: string;
  hasBeforePhoto: boolean;
  hasAfterPhoto: boolean;
  /** When the cleanup was completed; absent for reports that are not completed. */
  completedAt?: string;
};

export async function loadPublicReportIndex() {
  const supabase = createPublicClient();
  const reports: PublicReportIndexEntry[] = [];
  let afterId: string | undefined;
  for (;;) {
    let query = supabase.from('reports')
      .select('id, title, latitude, longitude, renewal_status, photo_paths, cleanup_state, cancelled_at, expired_at, expires_at, is_sample, is_published')
      .eq('is_published', true).eq('is_sample', false)
      .order('id').limit(1000);
    if (afterId) query = query.gt('id', afterId);
    const { data, error } = await query;
    // A backend outage should not publish an apparently successful empty sitemap.
    if (error) throw error;
    const visible = data.filter(report => isPubliclyShareableReport(report));
    const afterPhotos = new Set<string>();
    const completedAt = new Map<string, string>();
    const completedIds = visible.filter(report => report.cleanup_state === 'completed').map(report => report.id);
    // Batch evidence lookups instead of loading every full report/profile/photo.
    for (let start = 0; start < completedIds.length; start += 200) {
      const finalSubmissions = new Map<string, string>();
      for (let offset = 0;; offset += 1000) {
        const { data: attempts, error: attemptError } = await supabase.from('cleanup_attempts')
          .select('id,report_id,final_submission_id,completed_at')
          .in('report_id', completedIds.slice(start, start + 200))
          .eq('status', 'completed').not('final_submission_id', 'is', null)
          .order('completed_at', { ascending: false }).order('id')
          .range(offset, offset + 999);
        if (attemptError) throw attemptError;
        for (const attempt of attempts) {
          if (attempt.final_submission_id && !finalSubmissions.has(attempt.report_id)) {
            finalSubmissions.set(attempt.report_id, attempt.final_submission_id);
            if (attempt.completed_at) completedAt.set(attempt.report_id, attempt.completed_at);
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
    reports.push(...await Promise.all(visible.map(async report => ({
      id: report.id,
      path: publicReportPath(report.id, report.title?.trim() || 'Litter Report',
        (await publicReportPlace(report.latitude, report.longitude, LIST_TOWN_WAIT_MS))?.localityLabel),
      hasBeforePhoto: Boolean(report.photo_paths?.[0]),
      hasAfterPhoto: afterPhotos.has(report.id),
      ...(completedAt.has(report.id) ? { completedAt: completedAt.get(report.id) } : {}),
    }))));
    if (data.length < 1000) return reports;
    afterId = data[data.length - 1].id;
    if (reports.length >= 49_000) throw new Error('Public report sitemap requires partitioning');
  }
}
