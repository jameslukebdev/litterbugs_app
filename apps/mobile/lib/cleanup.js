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
