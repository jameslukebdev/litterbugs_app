import { errorMessage, isUuid, serviceClient, stripeClient } from './funded-cleanup.ts';
import { claimedOperationRow } from './maintenance-operation.ts';
import { transferMatchesLedger } from './stripe-reconciliation.ts';

type Reward = {
  cleanup_attempt_id: string;
  report_id: string;
  reporter_id: string;
  amount_cents: number;
  payout_attempts: number;
  attempt_started_at: string;
  stripe_destination_id: string;
  stripe_transfer_id: string | null;
};
type Admin = ReturnType<typeof serviceClient>;
type Transfer = {
  id: string; amount: number; currency: string;
  destination: string | { id: string } | null;
  metadata: Record<string, string>;
  reversed?: boolean; amount_reversed?: number;
};

export async function processReporterPayout(admin: Admin, stripe = stripeClient(), now = Date.now()) {
  const { data, error } = await admin.rpc('claim_reporter_payout_operation');
  if (error) throw error;
  const reward = claimedOperationRow<Reward>(data, 'cleanup_attempt_id');
  if (!reward) return null;
  if (!isUuid(reward.cleanup_attempt_id) || !isUuid(reward.report_id) || !isUuid(reward.reporter_id)
    || !Number.isSafeInteger(reward.amount_cents) || reward.amount_cents <= 0
    || !Number.isSafeInteger(reward.payout_attempts) || reward.payout_attempts < 1
    || !reward.stripe_destination_id?.startsWith('acct_') || !Number.isFinite(Date.parse(reward.attempt_started_at))) {
    throw new Error('Reporter payout returned invalid ledger data');
  }
  // Stripe retains idempotency keys for at least 24 hours. Never automatically
  // recreate a transfer with an uncertain outcome after that protection expires.
  if (now - Date.parse(reward.attempt_started_at) >= 23 * 60 * 60 * 1000) {
    const { error: markError } = await admin.rpc('mark_reporter_payout_result', {
      target_cleanup_id: reward.cleanup_attempt_id, target_status: 'failed',
      target_error: 'Check Stripe before retrying: the reporter transfer outcome is unconfirmed.', block_retry: true,
    });
    if (markError) throw markError;
    return { cleanupId: reward.cleanup_attempt_id, status: 'needs_review' };
  }
  let transfer;
  try {
    transfer = await stripe.transfers.create({
      amount: reward.amount_cents, currency: 'usd', destination: reward.stripe_destination_id,
      transfer_group: `cleanup_report_${reward.report_id}`,
      metadata: { reporter_reward_id: reward.cleanup_attempt_id, report_id: reward.report_id,
        reporter_payout_attempt: String(reward.payout_attempts) },
    }, { idempotencyKey: `reporter-payout-${reward.cleanup_attempt_id}-${reward.payout_attempts}` });
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    if (code === 'balance_insufficient') {
      const { error: markError } = await admin.rpc('mark_reporter_payout_result', {
        target_cleanup_id: reward.cleanup_attempt_id, target_status: 'waiting_funds',
      });
      if (markError) throw markError;
      return { cleanupId: reward.cleanup_attempt_id, status: 'waiting_funds' };
    }
    const type = error && typeof error === 'object' && 'type' in error ? String(error.type) : '';
    // Definite request failures can be retried by the existing admin workflow.
    // Connection/server/unknown errors retain the same key for worker recovery.
    if (['StripeInvalidRequestError', 'StripePermissionError', 'StripeAuthenticationError'].includes(type)) {
      const { error: markError } = await admin.rpc('mark_reporter_payout_result', {
        target_cleanup_id: reward.cleanup_attempt_id, target_status: 'failed', target_error: errorMessage(error),
      });
      if (markError) throw markError;
    }
    throw error;
  }
  const { error: markError } = await admin.rpc('mark_reporter_payout_result', {
    target_cleanup_id: reward.cleanup_attempt_id, target_status: 'transferred', target_transfer_id: transfer.id,
  });
  if (markError) throw markError;
  return { cleanupId: reward.cleanup_attempt_id, status: 'transferred' };
}

export async function reconcileReporterTransfer(admin: Admin, transfer: Transfer, reversed: boolean) {
  const id = transfer.metadata?.reporter_reward_id;
  if (!isUuid(id)) return;
  const { data: reward, error } = await admin.from('reporter_rewards')
    .select('report_id, amount_cents, stripe_destination_id, stripe_transfer_id, payout_attempts')
    .eq('cleanup_attempt_id', id).maybeSingle();
  if (error) throw error;
  if (!reward || transfer.metadata.report_id !== reward.report_id
    || transfer.metadata.reporter_payout_attempt !== String(reward.payout_attempts)
    || !transferMatchesLedger({ transferId: transfer.id,
      transferDestinationId: typeof transfer.destination === 'string' ? transfer.destination : transfer.destination?.id,
      transferAmountCents: transfer.amount, transferCurrency: transfer.currency,
      ledgerTransferId: reward.stripe_transfer_id, ledgerDestinationId: reward.stripe_destination_id,
      ledgerRewardCents: reward.amount_cents })) return;
  const isReversed = reversed || transfer.reversed || (transfer.amount_reversed ?? 0) > 0;
  const { error: markError } = await admin.rpc('mark_reporter_payout_result', {
    target_cleanup_id: id, target_status: isReversed ? 'reversed' : 'transferred', target_transfer_id: transfer.id,
    target_error: isReversed ? 'Stripe transfer reversed; check the reporter reward before restoring it.' : null,
  });
  if (markError) throw markError;
}
