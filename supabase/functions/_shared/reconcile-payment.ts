import Stripe from "npm:stripe@22.5.0";
import { serviceClient } from "./funded-cleanup.ts";
import { paymentIntentMatchesLedger } from "./stripe-reconciliation.ts";

export const reconcileSuccessfulPaymentIntent = async (
  admin: ReturnType<typeof serviceClient>,
  intent: Stripe.PaymentIntent,
) => {
  const { data: contribution, error: contributionError } = await admin
    .from("cleanup_contributions")
    .select(
      "report_id, contributor_id, client_request_id, principal_amount_cents, platform_fee_cents, total_amount_cents, stripe_payment_intent_id",
    )
    .eq("stripe_payment_intent_id", intent.id)
    .maybeSingle();
  if (contributionError) throw contributionError;
  if (!contribution) {
    if (intent.metadata?.purpose === "cleanup_fund") {
      throw new Error("cleanup_contribution_not_found");
    }
    return;
  }
  if (!paymentIntentMatchesLedger({
    intentId: intent.id,
    intentAmountReceivedCents: intent.amount_received,
    intentCurrency: intent.currency,
    intentTransferGroup: intent.transfer_group,
    intentMetadata: intent.metadata,
    ledgerPaymentIntentId: contribution.stripe_payment_intent_id,
    ledgerReportId: contribution.report_id,
    ledgerContributorId: contribution.contributor_id,
    ledgerClientRequestId: contribution.client_request_id,
    ledgerPrincipalCents: contribution.principal_amount_cents,
    ledgerFeeCents: contribution.platform_fee_cents,
    ledgerTotalCents: contribution.total_amount_cents,
  })) {
    throw new Error(
      "Stripe PaymentIntent details did not match the Litterbugs contribution ledger",
    );
  }

  const chargeId = typeof intent.latest_charge === "string"
    ? intent.latest_charge
    : intent.latest_charge?.id ?? null;
  const { error } = await admin.rpc("finalize_cleanup_contribution", {
    payment_intent_id: intent.id,
    charge_id: chargeId,
    payment_succeeded: true,
    payment_failure_code: null,
  });
  if (error) throw error;
};
