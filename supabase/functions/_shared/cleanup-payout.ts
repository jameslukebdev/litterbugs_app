import { errorMessage, isUuid, serviceClient, stripeClient } from "./funded-cleanup.ts";
import { claimedOperationRow, payoutSourceTransaction } from "./maintenance-operation.ts";

type PayoutOperation = {
  id: string; cleaner_id: string; report_id: string;
  reward_amount_cents: number; payout_attempts: number;
  payout_attempt_started_at: string; recovering: boolean;
};
const isDefiniteStripeError = (error: unknown) => {
  const type = error && typeof error === "object" && "type" in error ? String(error.type) : "";
  return ["StripeInvalidRequestError", "StripePermissionError", "StripeAuthenticationError"].includes(type);
};

export const processCleanupPayout = async (admin: ReturnType<typeof serviceClient>, stripe = stripeClient(), now = Date.now()) => {
  const { data, error } = await admin.rpc(
    "claim_cleanup_payout_operation_v2",
  );
  if (error) throw error;
  const attempt = claimedOperationRow<PayoutOperation>(data);
  if (!attempt) return null;
  if (
    !isUuid(attempt.id) || !isUuid(attempt.cleaner_id) ||
    !isUuid(attempt.report_id) ||
    !Number.isSafeInteger(attempt.reward_amount_cents) ||
    attempt.reward_amount_cents <= 0 ||
    !Number.isSafeInteger(attempt.payout_attempts) ||
    attempt.payout_attempts < 1 || typeof attempt.recovering !== "boolean"
  ) {
    throw new Error("Payout operation returned invalid ledger data");
  }

  if (!Number.isFinite(Date.parse(attempt.payout_attempt_started_at))) {
    throw new Error("Payout operation returned an invalid start time");
  }
  // Never replay an uncertain transfer after Stripe's idempotency retention window.
  if (now - Date.parse(attempt.payout_attempt_started_at) >= 23 * 60 * 60 * 1000) {
    const { error } = await admin.rpc("mark_cleanup_payout_result", {
      target_cleanup_id: attempt.id, transfer_succeeded: false,
      target_error: "Check Stripe before retrying: the cleaner transfer outcome is unconfirmed.",
    });
    if (error) throw error;
    return { cleanupId: attempt.id, status: "needs_review" };
  }
  const waitForFunds = async () => {
    const { error } = await admin.rpc("defer_cleanup_payout_for_funds", {
      target_cleanup_id: attempt.id, expected_attempt: attempt.payout_attempts,
    });
    if (error) throw error;
    return { cleanupId: attempt.id, status: "waiting_funds" };
  };

  const { data: payoutAccount, error: accountError } = await admin
    .from("cleaner_payout_accounts")
    .select("stripe_account_id, payouts_enabled")
    .eq("user_id", attempt.cleaner_id)
    .single();
  if (accountError) throw accountError;
  if (!payoutAccount.payouts_enabled || !payoutAccount.stripe_account_id) {
    const payoutError = new Error("Cleaner payout account is not enabled");
    const { error: markError } = await admin.rpc("mark_cleanup_payout_result", {
      target_cleanup_id: attempt.id,
      transfer_succeeded: false,
      target_transfer_id: null,
      target_error: payoutError.message,
    });
    if (markError) throw markError;
    throw payoutError;
  }

  const { data: payoutContributions, error: contributionError } = await admin
    .from("cleanup_contributions")
    .select("stripe_charge_id, principal_amount_cents")
    .eq("cleanup_attempt_id", attempt.id)
    .eq("status", "succeeded");
  if (contributionError) throw contributionError;
  const sourceTransaction = payoutSourceTransaction(
    payoutContributions ?? [],
    attempt.reward_amount_cents,
  );

  // Recovery must replay the same key even if a successful transfer has already
  // reduced the balance. A preflight check is safe only for a newly claimed attempt.
  if (!attempt.recovering && !sourceTransaction) {
    const balance = await stripe.balance.retrieve();
    const usd = balance.available.find((entry) => entry.currency === "usd");
    const available = usd?.source_types?.card ?? usd?.amount ?? 0;
    if (!Number.isSafeInteger(available)) throw new Error("Invalid Stripe balance");
    if (available < attempt.reward_amount_cents) return await waitForFunds();
  }

  let transfer;
  try {
    transfer = await stripe.transfers.create({
      amount: attempt.reward_amount_cents,
      currency: "usd",
      destination: payoutAccount.stripe_account_id,
      transfer_group: `cleanup_report_${attempt.report_id}`,
      metadata: {
        cleanup_attempt_id: attempt.id,
        report_id: attempt.report_id,
      },
      ...(sourceTransaction
        ? { source_transaction: sourceTransaction }
        : {}),
    }, {
      idempotencyKey: `cleanup-payout-${attempt.id}-${attempt.payout_attempts}`,
    });
  } catch (transferError) {
    if (transferError && typeof transferError === "object" && "code" in transferError
      && transferError.code === "balance_insufficient") {
      return await waitForFunds();
    }
    if (isDefiniteStripeError(transferError)) {
      const { error } = await admin.rpc("mark_cleanup_payout_result", {
        target_cleanup_id: attempt.id, transfer_succeeded: false,
        target_transfer_id: null, target_error: errorMessage(transferError),
      });
      if (error) throw error;
    }
    // Timeouts, provider/server errors and unclassified failures retain the
    // processing state and key for recovery; never assume money did not move.
    throw transferError;
  }

  const { error: markError } = await admin.rpc("mark_cleanup_payout_result", {
    target_cleanup_id: attempt.id,
    transfer_succeeded: true,
    target_transfer_id: transfer.id,
    target_error: null,
  });
  if (markError) throw markError;
  return { cleanupId: attempt.id, status: "transferred" };
};

