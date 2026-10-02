import type { Database, Report } from '@litterbugs/report-contract';
import { isReportClosed } from './report-visibility';
export type ProgressAttempt = Pick<Database['public']['Tables']['cleanup_attempts']['Row'], 'id' | 'cleaner_id' | 'status' | 'claimed_at' | 'claim_expires_at' | 'first_submitted_at' | 'latest_submitted_at' | 'review_due_at' | 'correction_due_at' | 'completed_at' | 'released_at' | 'cancelled_at' | 'expired_at' | 'is_paid' | 'payout_status' | 'financial_review_status' | 'first_paid_admin_status' | 'dispute_status'>;
export function cleanupProgress(report: Report, attempt: ProgressAttempt | null, userId: string) {
  const events: { label: string; at: string }[] = [];
  const add = (label: string, at: string | null | undefined) => { if (at && Number.isFinite(Date.parse(at))) events.push({label,at}); };
  add('Report created', report.created_at);
  if (attempt) {
    add('Cleanup claimed', attempt.claimed_at);
    add('Cleanup evidence submitted', attempt.first_submitted_at);
    if (attempt.latest_submitted_at !== attempt.first_submitted_at) add('Updated evidence submitted', attempt.latest_submitted_at);
    add('Cleanup completed', attempt.completed_at);
    add('Claim released', attempt.released_at);
    add('Cleanup cancelled', attempt.cancelled_at);
    add('Claim expired', attempt.expired_at);
  }
  add('Report cancelled', report.cancelled_at); add('Report expired', report.expired_at);
  const cleaner = attempt?.cleaner_id === userId;
  const owner = report.user_id === userId;
  let next = 'A cleaner can claim this report from the map.';
  let due: string | null = null;
  let task: 'cleanup' | 'review' | undefined;
  if (isReportClosed(report)) next = 'This report is closed. Your activity remains in your account.';
  else if (report.cleanup_state === 'completed') next = 'Cleanup complete. Any reward or refund has its own payment status.';
  else if (report.cleanup_state === 'claimed' || report.cleanup_state === 'changes_requested') {
    next = report.cleanup_state === 'changes_requested'
      ? cleaner ? 'Your turn: address the review feedback and submit updated evidence.' : 'The cleaner needs to address the feedback and submit updated evidence.'
      : cleaner ? 'Your turn: clean the site and submit after photos.' : 'The cleaner is preparing the after-cleanup evidence.';
    due = report.cleanup_state === 'changes_requested' ? attempt?.correction_due_at ?? null : attempt?.claim_expires_at ?? null;
    if (cleaner) task = 'cleanup';
  } else if (report.cleanup_state === 'completion_submitted') {
    next = owner ? 'Your turn: review the cleanup evidence.' : 'Cleanup evidence is awaiting review. You do not need to upload it again.';
    due = attempt?.review_due_at ?? null;
    if (owner) task = 'review';
  }
  let payment: string | undefined;
  if (cleaner && attempt?.is_paid) {
    if (attempt.payout_status === 'transferred') payment = 'Reward sent to your connected payout account. Bank arrival follows its payout schedule.';
    else if (['released','cancelled','expired'].includes(attempt.status)) payment = 'This cleanup attempt is closed. Check your payment records for its final financial status.';
    else if (attempt.payout_status === 'failed') payment = 'Reward transfer failed. Review your payout account.';
    else if (attempt.dispute_status === 'open' || attempt.financial_review_status === 'admin_review') payment = 'Reward paused for review.';
    else if (attempt.financial_review_status === 'better_photos') payment = 'Replacement evidence is needed before the reward can proceed.';
    else if (attempt.first_paid_admin_status === 'pending') payment = 'Your first reward is under review.';
    else payment = 'Reward pending. Cleanup completion does not confirm a transfer.';
  }
  return {events: events.sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)),next,due,task,payment};
}
