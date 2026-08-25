import { supabase } from './supabase';

const SIGNED_PHOTO_DURATION_SECONDS = 60 * 60;

const CLEANER_PROFILE_FIELDS = [
  'id',
  'display_name',
  'username',
  'provider_avatar_url',
  'avatar_path',
  'updated_at',
].join(',');

async function createCleanupPhotoUrl(path) {
  const { data, error } = await supabase.storage
    .from('cleanup_photos')
    .createSignedUrl(path, SIGNED_PHOTO_DURATION_SECONDS);

  if (error) throw error;
  return data?.signedUrl ?? null;
}

export async function loadCompletedCleanupImpact(reportId) {
  if (!reportId) throw new Error('cleanup_impact_report_required');

  const { data: attempt, error: attemptError } = await supabase
    .from('cleanup_attempts')
    .select('id, report_id, cleaner_id, status, completed_at, approval_method, is_self_cleanup, final_submission_id')
    .eq('report_id', reportId)
    .eq('status', 'completed')
    .not('final_submission_id', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (attemptError) throw attemptError;
  if (!attempt) return null;

  const [submissionResult, cleanerResult, photosResult] = await Promise.all([
    supabase
      .from('cleanup_submissions')
      .select('id, cleanup_attempt_id, description, bags_or_items_removed, duration_minutes, created_at')
      .eq('id', attempt.final_submission_id)
      .eq('cleanup_attempt_id', attempt.id)
      .maybeSingle(),
    attempt.cleaner_id
      ? supabase
        .from('profiles')
        .select(CLEANER_PROFILE_FIELDS)
        .eq('id', attempt.cleaner_id)
        .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from('cleanup_submission_photos')
      .select('id, storage_path, display_order, uploaded_at')
      .eq('submission_id', attempt.final_submission_id)
      .order('display_order', { ascending: true }),
  ]);

  if (submissionResult.error) throw submissionResult.error;
  if (cleanerResult.error) throw cleanerResult.error;
  if (photosResult.error) throw photosResult.error;
  if (!submissionResult.data) throw new Error('cleanup_impact_submission_unavailable');

  const afterPhotoUrls = await Promise.all(
    (photosResult.data ?? []).map(({ storage_path: path }) => (
      createCleanupPhotoUrl(path)
    ))
  );

  return {
    attempt,
    submission: submissionResult.data,
    cleaner: cleanerResult.data ?? null,
    afterPhotoUrls: afterPhotoUrls.filter(Boolean),
  };
}
