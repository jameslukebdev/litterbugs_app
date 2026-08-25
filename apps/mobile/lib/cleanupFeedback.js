import { supabase } from './supabase';

export async function loadCleanupFeedbackContext(cleanupId, userId) {
  const { data: attempt, error: attemptError } = await supabase
    .from('cleanup_attempts')
    .select('id, report_id, cleaner_id, status, correction_due_at')
    .eq('id', cleanupId)
    .maybeSingle();

  if (attemptError) throw attemptError;
  if (!attempt || attempt.cleaner_id !== userId) {
    throw new Error('cleanup_feedback_not_allowed');
  }
  if (attempt.status !== 'changes_requested') {
    throw new Error('cleanup_feedback_invalid_state');
  }

  const [reportResult, reviewResult] = await Promise.all([
    supabase
      .from('reports')
      .select('id, title, cleanup_state')
      .eq('id', attempt.report_id)
      .maybeSingle(),
    supabase
      .from('cleanup_reviews')
      .select('id, submission_id, reason_codes, note, created_at')
      .eq('cleanup_attempt_id', attempt.id)
      .eq('decision', 'changes_requested')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (reportResult.error) throw reportResult.error;
  if (reviewResult.error) throw reviewResult.error;
  if (!reportResult.data || !reviewResult.data) {
    throw new Error('cleanup_feedback_unavailable');
  }

  return {
    attempt,
    report: reportResult.data,
    review: reviewResult.data,
  };
}
