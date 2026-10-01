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
  cleanupId, userId, submissionId, photos, description, bagsOrItems, weightPounds,
  isPaid, onProgress = () => {},
  uploadedPaths = [], onPrepared = async () => {},
}: {
  cleanupId: string; userId: string; submissionId: string; photos: File[];
  description: string; bagsOrItems?: number; weightPounds?: number; isPaid: boolean;
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
  if (await findSaved()) {
    if (isPaid) await startReview(cleanupId);
    return;
  }
  let dispatched = false;
  const paths: string[] = [...uploadedPaths];
  let uploaded = 0;
  try {
    if (!paths.length) {
      onProgress(`Uploading photos… 0/${photos.length}`);
      await uploadConcurrently(photos, (file, index) => uploadSecureBrowserMedia({
      supabase, userId, kind: 'cleanup', file, subjectId: cleanupId,
      submissionId, position: index + 1,
    }), (path, index) => {
      paths[index] = path;
      onProgress(`Uploading photos… ${++uploaded}/${photos.length}`);
      });
    }
    await onPrepared(paths);
    onProgress('Saving cleanup…');
    dispatched = true;
    const { error } = await supabase.rpc('submit_cleanup_with_weight', {
      target_cleanup_id: cleanupId,
      target_submission_id: submissionId,
      cleanup_description: description.trim(),
      cleanup_photo_paths: paths,
      cleanup_bags_or_items_removed: bagsOrItems,
      cleanup_weight_pounds: weightPounds,
    });
    if (error) throw error;
  } catch (error) {
    if (dispatched) {
      const saved = await findSaved().catch(() => null);
      // A missing response is not proof of rollback. Never remove potentially committed evidence.
      if (!saved) throw new CleanupSubmissionUncertainError();
    } else {
      if (paths.length && !uploadedPaths.length) await supabase.storage.from('cleanup_photos').remove(paths.filter(Boolean)).catch(() => undefined);
      throw error;
    }
  }
  if (isPaid) {
    onProgress('Starting photo review…');
    await startReview(cleanupId);
  }
}
