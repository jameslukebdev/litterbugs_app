import { hasReportCoordinates, MAX_REPORT_PHOTOS, reportUpdateFromDraft, type Database, type Report, type ReportDraft } from '@litterbugs/report-contract';
import type { SupabaseClient } from '@supabase/supabase-js';

// Uploaded replacements remain private until the report update succeeds. Never
// delete them after an ambiguous response: the update may already have committed.
export async function saveReportEdit({ supabase, report, draft, userId, replacementPaths }: {
  supabase: SupabaseClient<Database>;
  report: Report;
  draft: ReportDraft;
  userId: string;
  replacementPaths: string[];
}) {
  const previousPaths = report.photo_paths ?? [];
  const photoPaths = replacementPaths.length ? replacementPaths : previousPaths;
  if (photoPaths.length < 1 || photoPaths.length > MAX_REPORT_PHOTOS) {
    throw new Error('Keep one to three photos attached to the report.');
  }
  const { data, error } = await supabase.from('reports')
    .update({ ...reportUpdateFromDraft(draft), ...(replacementPaths.length ? { photo_paths: photoPaths } : {}) })
    .eq('id', report.id).eq('user_id', userId).select().single();
  if (error) throw new Error(`We could not confirm the edit. Refresh the report before retrying. ${error.message}`);
  if (!hasReportCoordinates(data)) throw new Error('The saved report is missing its map location.');

  // Cleanup is after the confirmed update and only includes superseded photos.
  // A cleanup failure must not turn a successful edit into a failed save.
  const obsoletePaths = previousPaths.filter(path => !photoPaths.includes(path));
  if (obsoletePaths.length) {
    try {
      const { error: cleanupError } = await supabase.storage.from('report_photos').remove(obsoletePaths);
      if (cleanupError) console.warn('Old report photos could not be removed.');
    } catch { console.warn('Old report photos could not be removed.'); }
  }
  return data;
}
