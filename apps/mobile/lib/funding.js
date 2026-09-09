import { savePaymentVerification, withPaymentVerification } from './paymentVerification';
import { applyHistoryCursor, historyPage, HISTORY_PAGE_SIZE } from './historyPagination';
import { supabase } from './supabase';
import { edgeFunctionErrorMessage } from './edgeFunctionError';

export const formatUsd = (cents = 0) => new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',
}).format(Number(cents) / 100);

export async function loadCleanupFeatureFlags() {
  const { data, error } = await supabase
    .from('cleanup_feature_flags')
    .select('name, enabled');
  if (error) throw error;
  return Object.fromEntries((data ?? []).map(({ name, enabled }) => [name, enabled]));
}

export async function createCleanupContribution({ reportId, principalAmountCents, clientRequestId }) {
  const { data, error } = await supabase.functions.invoke('create-cleanup-contribution', {
    body: { reportId, principalAmountCents, clientRequestId },
  });
  if (error) throw new Error(await edgeFunctionErrorMessage(data, error, 'Payment could not be started. Please try again.'));
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function loadPayoutStatus() {
  const { data, error } = await supabase.functions.invoke('create-cleaner-onboarding-link', {
    body: { mode: 'status' },
  });
  if (error) throw new Error(await edgeFunctionErrorMessage(data, error, 'Payout status could not be loaded. Please try again.'));
  return data;
}

export async function createPayoutOnboardingLink() {
  const { data, error } = await supabase.functions.invoke('create-cleaner-onboarding-link', {
    body: { mode: 'link', confirmAge18: true },
  });
  if (error) throw new Error(await edgeFunctionErrorMessage(
    data,
    error,
    'Payout setup is temporarily unavailable. Please try again later.',
  ));
  if (!data?.url) throw new Error(data?.error || 'Payout setup is unavailable');
  return data;
}

export async function createPayoutDashboardLink() {
  const { data, error } = await supabase.functions.invoke('create-cleaner-onboarding-link', {
    body: { mode: 'dashboard' },
  });
  if (error) throw new Error(await edgeFunctionErrorMessage(
    data,
    error,
    'Payout details are temporarily unavailable. Please try again later.',
  ));
  if (!data?.url) throw new Error(data?.error || 'Payout dashboard is unavailable');
  return data;
}

export async function loadMyContribution(id, userId, { verify = true } = {}) {
  if (!id || !userId) return null;
  const { data, error } = await supabase.from('cleanup_contributions')
    .select('id, report_id, principal_amount_cents, platform_fee_cents, total_amount_cents, status, created_at, refunded_at, report:reports(id,title,cleanup_state,funding_eligibility)')
    .eq('id', id).eq('contributor_id', userId).maybeSingle();
  if (error) throw error;
  if (data?.status === 'payment_pending' && verify) {
    const { data: verification, error: verificationError } = await supabase.functions.invoke('check-contribution-status', { body: { contributionId: id } });
    if (verificationError || verification?.error) return { ...await withPaymentVerification(userId, data), verificationUnavailable: true };
    await savePaymentVerification(userId, data, verification);
    const latest = await loadMyContribution(id, userId, { verify: false });
    return { ...(latest || data), providerState: verification.providerState, checkedAt: verification.checkedAt };
  }
  return withPaymentVerification(userId, data);
}

export async function loadMyContributions({ userId, cursor = null, completedOnly = false } = {}) {
  if (!userId) return historyPage();
  let query = supabase.from('cleanup_contributions')
    .select(`id, report_id, principal_amount_cents, platform_fee_cents, total_amount_cents, status, created_at, refunded_at, report:reports${completedOnly ? '!inner' : ''}(id,title,cleanup_state,funding_eligibility)`)
    .eq('contributor_id', userId);
  if (completedOnly) query = query.eq('report.cleanup_state', 'completed').in('status', ['succeeded', 'paid_out']);
  query = applyHistoryCursor(query, cursor);
  const { data, error } = await query.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(HISTORY_PAGE_SIZE + 1);
  if (error) throw error;
  return historyPage(await Promise.all((data ?? []).map(item => withPaymentVerification(userId, item))));
}

export async function loadReportFundingFeedback(reportId) {
  const { data, error } = await supabase
    .from('cleanup_ai_checks')
    .select('status, user_summary, reason_codes, completed_at')
    .eq('report_id', reportId)
    .eq('check_kind', 'report')
    .not('user_summary', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function loadMyExpiredReports(userId) {
  const { data, error } = await supabase
    .from('reports')
    .select('id, title, funded_amount_cents, expires_at, renewal_decision_due_at, renewal_status')
    .eq('user_id', userId)
    .eq('renewal_status', 'decision_required')
    .order('renewal_decision_due_at');
  if (error) throw error;
  return data ?? [];
}

export async function renewExpiredReport(reportId) {
  const { data, error } = await supabase.rpc('renew_report', { target_report_id: reportId });
  if (error) throw error;
  return data;
}

export async function closeExpiredReport(reportId) {
  const { data, error } = await supabase.rpc('close_expired_report', { target_report_id: reportId });
  if (error) throw error;
  return data;
}

export async function requestGeminiReview(target) {
  const { data, error } = await supabase.functions.invoke('run-financial-maintenance', {
    body: target,
  });
  if (error) throw new Error(data?.error || error.message);
  return data;
}
