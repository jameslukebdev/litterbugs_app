import { trackParticipationFailure } from './website-analytics';
import { uploadConcurrently } from '@/lib/concurrent-upload';
import { uploadSecureBrowserMedia } from '@/lib/secure-media-upload';
import { createClient } from '@/lib/supabase/client';

export class CleanupSubmissionUncertainError extends Error {
  constructor() {
    super('We could not confirm the submission yet. Your photos are preserved. Retry to check whether it was saved before sending again.');
  }
}

async function startReview(cleanupId: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      createClient().functions.invoke('run-financial-maintenance', { body: { cleanupId } }),
      new Promise<void>(resolve => { timer = setTimeout(resolve, 3000); }),
    ]);
  } catch {
    // Submission enqueues durable review. A foreground request is only an acceleration.
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function submitCleanupEvidence({
  cleanupId, userId, submissionId, photos, description, bagsOrItems, weightPounds, durationMinutes,
  isPaid, onProgress = () => {},
  uploadedPaths = [], onPrepared = async () => {},
}: {
  cleanupId: string; userId: string; submissionId: string; photos: File[];
  description: string; bagsOrItems?: number; weightPounds?: number; durationMinutes?: number; isPaid: boolean;
  onProgress?: (message: string) => void;
  uploadedPaths?: string[];
  onPrepared?: (paths: string[]) => Promise<void>;
}) {
  const supabase = createClient();
  const findSaved = async () => {
    const { data, error } = await supabase.from('cleanup_submissions')
      .select('id').eq('id', submissionId).eq('cleanup_attempt_id', cleanupId).maybeSingle();
    if (error) throw error;
    return data;
  };
  onProgress('Checking for a saved submission…');
  let saved;
  try { saved = await findSaved(); }
  catch (error) { trackParticipationFailure('clean', 'evidence_form', 'evidence_check_failed'); throw error; }
  if (saved) {
    if (isPaid) await startReview(cleanupId);
    return;
  }
  let dispatched = false;
  const paths: string[] = [...uploadedPaths];
  let uploaded = 0;
  let failureReason: 'photo_upload_failed' | 'draft_save_failed' = 'photo_upload_failed';
  try {
    if (!paths.length) {
      onProgress(`Uploading and checking photos… 0/${photos.length}`);
      await uploadConcurrently(photos, async (file, index) => {
        try { return await uploadSecureBrowserMedia({
          supabase, userId, kind: 'cleanup', file, subjectId: cleanupId,
          submissionId, position: index + 1,
        }); } catch (error) {
          throw new Error(`Photo ${index + 1} (${file.name}): ${error instanceof Error ? error.message : 'Upload could not be completed.'} Your selected photos remain in this draft.`);
        }
      }, (path, index) => {
      paths[index] = path;
      onProgress(`Uploading and checking photos… ${++uploaded}/${photos.length}`);
      });
    }
    failureReason = 'draft_save_failed';
    await onPrepared(paths);
    onProgress('Saving cleanup…');
    dispatched = true;
    const args = {
      target_cleanup_id: cleanupId,
      target_submission_id: submissionId,
      cleanup_description: description.trim(),
      cleanup_photo_paths: paths,
      cleanup_bags_or_items_removed: bagsOrItems,
      cleanup_weight_pounds: weightPounds,
    };
    const { error } = durationMinutes === undefined
      ? await supabase.rpc('submit_cleanup_with_weight', args)
      : await supabase.rpc('submit_cleanup_with_details', { ...args, cleanup_duration_minutes: durationMinutes });
    if (error) throw error;
  } catch (error) {
    if (dispatched) {
      const saved = await findSaved().catch(() => null);
      // A missing response is not proof of rollback. Never remove potentially committed evidence.
      if (!saved) { trackParticipationFailure('clean', 'evidence_form', 'evidence_submit_unconfirmed'); throw new CleanupSubmissionUncertainError(); }
    } else {
      trackParticipationFailure('clean', 'evidence_form', failureReason);
      if (paths.length && !uploadedPaths.length) await supabase.storage.from('cleanup_photos').remove(paths.filter(Boolean)).catch(() => undefined);
      throw error;
    }
  }
  if (isPaid) {
    onProgress('Starting photo review…');
    await startReview(cleanupId);
  }
}
