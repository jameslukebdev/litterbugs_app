import { supabase } from './supabase';

export async function loadCurrentCleanupWaiver() {
  const { data: waiver, error: waiverError } = await supabase
    .from('cleanup_waiver_versions')
    .select('waiver_version, guidelines_version, title, body, published_at')
    .eq('is_active', true)
    .is('retired_at', null)
    .maybeSingle();

  if (waiverError) throw waiverError;
  if (!waiver) throw new Error('cleanup_waiver_unavailable');

  const { data: acceptance, error: acceptanceError } = await supabase
    .from('cleanup_waiver_acceptances')
    .select('accepted_at')
    .eq('waiver_version', waiver.waiver_version)
    .eq('guidelines_version', waiver.guidelines_version)
    .maybeSingle();

  if (acceptanceError) throw acceptanceError;

  return {
    waiver,
    acceptedAt: acceptance?.accepted_at ?? null,
  };
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
    .select('id, report_id, cleaner_id, reporter_id, status, claimed_at, claim_expires_at')
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
    .select('id, cleanup_attempt_id, report_id, event_type, created_at')
    .eq('event_type', 'claim_expired')
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
