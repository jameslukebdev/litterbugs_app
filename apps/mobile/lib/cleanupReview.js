import { PUBLIC_PROFILE_FIELDS } from './profile';
import { supabase } from './supabase';

const SIGNED_PHOTO_DURATION_SECONDS = 60 * 60;

const createSignedPhotoUrl = async (bucket, path) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_PHOTO_DURATION_SECONDS);

  if (error) throw error;
  return data?.signedUrl ?? null;
};

export async function loadCleanupReviewContext(cleanupId, userId) {
  const { data: attempt, error: attemptError } = await supabase
    .from('cleanup_attempts')
    .select('id, report_id, cleaner_id, reporter_id, status, review_due_at, is_self_cleanup')
    .eq('id', cleanupId)
    .maybeSingle();

  if (attemptError) throw attemptError;
  if (!attempt || attempt.reporter_id !== userId) {
    throw new Error('cleanup_review_not_allowed');
  }
  if (attempt.status !== 'completion_submitted') {
    throw new Error('cleanup_review_invalid_state');
  }

  const [reportResult, submissionResult, cleanerResult] = await Promise.all([
    supabase
      .from('reports')
      .select('id, title, photo_paths, created_at, cleanup_state')
      .eq('id', attempt.report_id)
      .maybeSingle(),
    supabase
      .from('cleanup_submissions')
      .select('id, cleanup_attempt_id, submission_number, submitted_by, description, bags_or_items_removed, duration_minutes, created_at')
      .eq('cleanup_attempt_id', attempt.id)
      .order('submission_number', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select(PUBLIC_PROFILE_FIELDS)
      .eq('id', attempt.cleaner_id)
      .maybeSingle(),
  ]);

  if (reportResult.error) throw reportResult.error;
  if (submissionResult.error) throw submissionResult.error;
  if (cleanerResult.error) throw cleanerResult.error;
  if (!reportResult.data || !submissionResult.data) {
    throw new Error('cleanup_review_evidence_unavailable');
  }

  const { data: photoRecords, error: photosError } = await supabase
    .from('cleanup_submission_photos')
    .select('id, storage_path, display_order, uploaded_at')
    .eq('submission_id', submissionResult.data.id)
    .order('display_order', { ascending: true });

  if (photosError) throw photosError;
  if (!photoRecords?.length) {
    throw new Error('cleanup_review_evidence_unavailable');
  }

  const [beforePhotoUrls, afterPhotoUrls] = await Promise.all([
    Promise.all(
      (reportResult.data.photo_paths ?? []).map((path) => (
        createSignedPhotoUrl('report_photos', path)
      ))
    ),
    Promise.all(
      photoRecords.map(({ storage_path: path }) => (
        createSignedPhotoUrl('cleanup_photos', path)
      ))
    ),
  ]);

  return {
    attempt,
    report: reportResult.data,
    submission: submissionResult.data,
    cleaner: cleanerResult.data ?? null,
    beforePhotoUrls: beforePhotoUrls.filter(Boolean),
    afterPhotoUrls: afterPhotoUrls.filter(Boolean),
  };
}

export async function reviewCleanup({
  cleanupId,
  submissionId,
  decision,
  reasons = null,
  note = null,
}) {
  const { data, error } = await supabase.rpc('review_cleanup', {
    target_cleanup_id: cleanupId,
    target_submission_id: submissionId,
    review_decision: decision,
    request_change_reasons: reasons,
    reviewer_note: note,
  });

  if (error) throw error;
  return data;
}
