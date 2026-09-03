import { supabase } from './supabase';

export async function withdrawOwnReport(reportId) {
  const { data, error } = await supabase.rpc('withdraw_own_report', {
    target_report_id: reportId,
  });

  if (error) throw error;
  return data;
}

export function reportWithdrawalErrorMessage(error) {
  const message = error?.message || '';

  if (/report_has_funding_activity/i.test(message)) {
    return 'This report has funding activity, so it must be closed through the cleanup fund process.';
  }
  if (/cleanup_activity_started/i.test(message)) {
    return 'Someone has already started this cleanup, so the report can no longer be withdrawn.';
  }
  if (/report_withdrawal_not_allowed/i.test(message)) {
    return 'This report is no longer active and cannot be withdrawn.';
  }
  if (/report_not_found|withdrawal_not_owned/i.test(message)) {
    return 'This report is no longer available in your account.';
  }

  return 'We couldn’t withdraw this report. Check your connection and try again.';
}
