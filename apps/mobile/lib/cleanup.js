import { supabase } from './supabase';
import { summarizeCleanupAttempts } from './cleanupProfile';

export async function loadCurrentCleanupWaiver() {
  const { data: waiver, error: waiverError } = await supabase
    .from('cleanup_waiver_versions')
    .select('waiver_version, guidelines_version, title, body, guidelines_body, release_body, published_at')
    .eq('is_active', true)
    .is('retired_at', null)
    .maybeSingle();

  if (waiverError) throw waiverError;
  if (!waiver) throw new Error('cleanup_waiver_unavailable');

  return { waiver };
}

export async function acceptCleanupWaiver(waiver) {
  const { data, error } = await supabase.rpc('accept_cleanup_waiver', {
    accepted_waiver_version: waiver.waiver_version,
    accepted_guidelines_version: waiver.guidelines_version,
  });

  if (error) throw error;
  return data;
}

export async function claimCleanup(reportId) {
  const { data, error } = await supabase.rpc('claim_cleanup', {
    target_report_id: reportId,
  });

  if (error) throw error;
  return data;
}

export async function loadActiveCleanupAttempt(reportId) {
  const { data, error } = await supabase
    .from('cleanup_attempts')
    .select('id, report_id, cleaner_id, reporter_id, status, claimed_at, claim_expires_at, correction_due_at')
    .eq('report_id', reportId)
    .in('status', ['claimed', 'completion_submitted', 'changes_requested'])
    .order('claimed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function releaseCleanup(cleanupId) {
  const { data, error } = await supabase.rpc('release_cleanup', {
    target_cleanup_id: cleanupId,
  });

  if (error) throw error;
  return data;
}

export async function loadUnreadCleanupNotifications() {
  const { data, error } = await supabase
    .from('cleanup_notifications')
    .select('id, cleanup_attempt_id, report_id, review_id, submission_id, event_type, created_at')
    .is('read_at', null)
    .order('created_at', { ascending: true })
    .limit(20);

  if (error) throw error;
  return data ?? [];
}

export async function acknowledgeCleanupNotifications(notificationIds) {
  if (!notificationIds.length) return [];

  const { data, error } = await supabase.rpc(
    'acknowledge_cleanup_notifications',
    { target_notification_ids: notificationIds }
  );

  if (error) throw error;
  return data ?? [];
}

export async function loadCurrentUserCleanupSummary(userId) {
  const { data: attempts, error: attemptsError } = await supabase
    .from('cleanup_attempts')
    .select('id, report_id, status, claimed_at, claim_expires_at, correction_due_at, latest_submitted_at, completed_at, approval_method, is_self_cleanup, is_paid, reward_amount_cents, financial_review_status, first_paid_admin_status, dispute_status, payout_status, last_activity_at')
    .eq('cleaner_id', userId)
    .in('status', ['claimed', 'completion_submitted', 'changes_requested', 'completed'])
    .order('last_activity_at', { ascending: false });

  if (attemptsError) throw attemptsError;
  if (!attempts?.length) return summarizeCleanupAttempts();

  const { data: reports, error: reportsError } = await supabase
    .from('reports')
    .select('id, title, severity, cleanup_state')
    .in('id', attempts.map(({ report_id: reportId }) => reportId));

  if (reportsError) throw reportsError;

  const reportsById = new Map(
    (reports ?? []).map((report) => [report.id, report])
  );

  return summarizeCleanupAttempts(attempts.map((attempt) => ({
    ...attempt,
    report: reportsById.get(attempt.report_id) ?? null,
  })));
}
