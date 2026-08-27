import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@22.5.0";
import {
  errorMessage,
  isUuid,
  jsonResponse,
  requiredEnv,
  retrieveStripeRecipientAccount,
  serviceClient,
  stripeClient,
  stripeRecipientState,
} from "../_shared/funded-cleanup.ts";
import {
  paymentIntentMatchesLedger,
  refundMatchesLedger,
  transferMatchesLedger,
} from "../_shared/stripe-reconciliation.ts";

type JsonObject = Record<string, unknown>;

const accountEventTypes = new Set([
  "v2.core.account.closed",
  "v2.core.account.created",
  "v2.core.account.updated",
  "v2.core.account[configuration.recipient].capability_status_updated",
  "v2.core.account[configuration.recipient].updated",
  "v2.core.account[identity].updated",
  "v2.core.account[requirements].updated",
]);

const alreadyProcessed = async (
  admin: ReturnType<typeof serviceClient>,
  eventId: string,
) => {
  const { data, error } = await admin.from("processed_stripe_events")
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
};

const recordProcessed = async (
  admin: ReturnType<typeof serviceClient>,
  event: { id: string; type: string; livemode: boolean },
  payload: JsonObject,
) => {
  const { error } = await admin.from("processed_stripe_events").insert({
    event_id: event.id,
    event_type: event.type,
    livemode: event.livemode,
    payload,
  });
  if (error && error.code !== "23505") throw error;
};

const syncRecipientAccount = async (
  admin: ReturnType<typeof serviceClient>,
  accountId: string,
  closed = false,
) => {
  const { data: existing, error: existingError } = await admin
    .from("cleaner_payout_accounts")
    .select("user_id")
    .eq("stripe_account_id", accountId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (!existing) return;

  if (closed) {
    const { error } = await admin.rpc("sync_cleaner_payout_account", {
      target_user_id: existing.user_id,
      target_stripe_account_id: accountId,
      target_onboarding_status: "restricted",
      target_payouts_enabled: false,
      target_country: "US",
      target_requirements_due: ["Stripe payout account is closed"],
    });
    if (error) throw error;
    return;
  }

  const account = await retrieveStripeRecipientAccount(accountId);
  const state = stripeRecipientState(account);
  const { error } = await admin.rpc("sync_cleaner_payout_account", {
    target_user_id: existing.user_id,
    target_stripe_account_id: account.id,
    target_onboarding_status: state.onboardingStatus,
    target_payouts_enabled: state.payoutsEnabled,
    target_country: "US",
    target_requirements_due: state.requirementsDue,
  });
  if (error) throw error;
};

const processThinAccountEvent = async (
  admin: ReturnType<typeof serviceClient>,
  stripe: ReturnType<typeof stripeClient>,
  rawBody: string,
  signature: string,
  rawPayload: JsonObject,
) => {
  const notification = await stripe.parseEventNotificationAsync(
    rawBody,
    signature,
    requiredEnv("STRIPE_V2_WEBHOOK_SECRET"),
  );
  if (await alreadyProcessed(admin, notification.id)) {
    return jsonResponse({ received: true, duplicate: true });
  }

  if (accountEventTypes.has(notification.type)) {
    const accountId = "related_object" in notification
      ? notification.related_object?.id
      : null;
    if (accountId) {
      await syncRecipientAccount(
        admin,
        accountId,
        notification.type === "v2.core.account.closed",
      );
    }
  }

  await recordProcessed(admin, notification, rawPayload);
  return jsonResponse({ received: true });
};

const findContributionId = async (
  admin: ReturnType<typeof serviceClient>,
  refund: Stripe.Refund,
) => {
  const metadataId = refund.metadata?.cleanup_contribution_id;
  if (isUuid(metadataId)) return metadataId;
  const paymentIntentId = typeof refund.payment_intent === "string"
    ? refund.payment_intent
    : refund.payment_intent?.id;
  if (!paymentIntentId) return null;
  const { data, error } = await admin.from("cleanup_contributions")
    .select("id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
};

const reconcileSuccessfulPaymentIntent = async (
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

const reconcileRefund = async (
  admin: ReturnType<typeof serviceClient>,
  refund: Stripe.Refund,
) => {
  const contributionId = await findContributionId(admin, refund);
  if (!contributionId) return;
  const paymentIntentId = typeof refund.payment_intent === "string"
    ? refund.payment_intent
    : refund.payment_intent?.id;
  const { data: contribution, error: contributionError } = await admin
    .from("cleanup_contributions")
    .select("status, total_amount_cents, stripe_payment_intent_id")
    .eq("id", contributionId)
    .maybeSingle();
  if (contributionError) throw contributionError;
  if (!contribution) return;
  if (!refundMatchesLedger({
    refundPaymentIntentId: paymentIntentId,
    refundAmountCents: refund.amount,
    refundCurrency: refund.currency,
    ledgerPaymentIntentId: contribution.stripe_payment_intent_id,
    ledgerTotalCents: contribution.total_amount_cents,
  })) {
    if (["refund_pending", "refund_processing"].includes(contribution.status)) {
      const { error } = await admin.rpc("mark_cleanup_refund_result", {
        target_contribution_id: contributionId,
        refund_succeeded: false,
        target_refund_id: refund.id,
        target_error:
          "Stripe refund details did not match the full Litterbugs contribution charge.",
      });
      if (error) throw error;
    }
    return;
  }
  if (refund.status === "succeeded") {
    const { error } = await admin.rpc("mark_cleanup_refund_result", {
      target_contribution_id: contributionId,
      refund_succeeded: true,
      target_refund_id: refund.id,
      target_error: null,
    });
    if (error) throw error;
    return;
  }
  if (refund.status === "failed" || refund.status === "canceled") {
    const { error } = await admin.rpc("mark_cleanup_refund_result", {
      target_contribution_id: contributionId,
      refund_succeeded: false,
      target_refund_id: refund.id,
      target_error: refund.failure_reason ?? `Stripe refund ${refund.status}`,
    });
    if (error) throw error;
    return;
  }

  if (contribution?.status === "refund_processing") {
    const { error } = await admin.rpc("mark_cleanup_refund_processing", {
      target_contribution_id: contributionId,
      target_refund_id: refund.id,
    });
    if (error) throw error;
  }
};

const reconcileTransfer = async (
  admin: ReturnType<typeof serviceClient>,
  transfer: Stripe.Transfer,
  reversed: boolean,
) => {
  const cleanupId = transfer.metadata?.cleanup_attempt_id;
  if (!isUuid(cleanupId)) return;
  const { data: attempt, error: attemptError } = await admin
    .from("cleanup_attempts")
    .select("cleaner_id, reward_amount_cents, payout_status, stripe_transfer_id")
    .eq("id", cleanupId)
    .maybeSingle();
  if (attemptError) throw attemptError;
  if (!attempt) return;
  const { data: payoutAccount, error: payoutAccountError } = await admin
    .from("cleaner_payout_accounts")
    .select("stripe_account_id")
    .eq("user_id", attempt.cleaner_id)
    .maybeSingle();
  if (payoutAccountError) throw payoutAccountError;
  const destinationId = typeof transfer.destination === "string"
    ? transfer.destination
    : transfer.destination?.id;
  const validTransfer = transferMatchesLedger({
    transferId: transfer.id,
    transferDestinationId: destinationId,
    transferAmountCents: transfer.amount,
    transferCurrency: transfer.currency,
    ledgerTransferId: attempt.stripe_transfer_id,
    ledgerDestinationId: payoutAccount?.stripe_account_id,
    ledgerRewardCents: attempt.reward_amount_cents,
  });
  if (!validTransfer) {
    if (["pending", "processing"].includes(attempt.payout_status)) {
      const { error } = await admin.rpc("mark_cleanup_payout_result", {
        target_cleanup_id: cleanupId,
        transfer_succeeded: false,
        target_transfer_id: null,
        target_error:
          "Stripe transfer details did not match the frozen Litterbugs reward.",
      });
      if (error) throw error;
    }
    return;
  }
  const { error } = reversed
    ? await admin.rpc("mark_cleanup_transfer_reversed", {
      target_cleanup_id: cleanupId,
      target_transfer_id: transfer.id,
      target_error: "Stripe transfer reversed; restore the cleaner reward.",
    })
    : await admin.rpc("mark_cleanup_payout_result", {
      target_cleanup_id: cleanupId,
      transfer_succeeded: true,
      target_transfer_id: transfer.id,
      target_error: null,
    });
  if (error) throw error;
};

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const signature = request.headers.get("stripe-signature");
  if (!signature) return jsonResponse({ error: "Missing signature" }, 400);

  const rawBody = await request.text();
  let rawPayload: JsonObject;
  try {
    rawPayload = JSON.parse(rawBody) as JsonObject;
  } catch {
    return jsonResponse({ error: "Invalid payload" }, 400);
  }

  const stripe = stripeClient();
  const admin = serviceClient();
  try {
    if (rawPayload.object === "v2.core.event") {
      return await processThinAccountEvent(admin, stripe, rawBody, signature, rawPayload);
    }

    const event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      requiredEnv("STRIPE_WEBHOOK_SECRET"),
    );
    if (await alreadyProcessed(admin, event.id)) {
      return jsonResponse({ received: true, duplicate: true });
    }

    switch (event.type) {
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;
        await reconcileSuccessfulPaymentIntent(admin, intent);
        break;
      }
      case "payment_intent.payment_failed":
      case "payment_intent.canceled": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const { error } = await admin.rpc("finalize_cleanup_contribution", {
          payment_intent_id: intent.id,
          charge_id: null,
          payment_succeeded: false,
          payment_failure_code: intent.last_payment_error?.code ?? event.type,
        });
        if (error && !/cleanup_contribution_not_found/i.test(error.message)) throw error;
        break;
      }
      case "refund.created":
      case "refund.updated":
      case "refund.failed":
        await reconcileRefund(admin, event.data.object as Stripe.Refund);
        break;
      case "transfer.created":
      case "transfer.updated":
        await reconcileTransfer(admin, event.data.object as Stripe.Transfer, false);
        break;
      case "transfer.reversed":
        await reconcileTransfer(admin, event.data.object as Stripe.Transfer, true);
        break;
      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId = typeof dispute.charge === "string"
          ? dispute.charge
          : dispute.charge.id;
        const { error } = await admin.rpc("record_stripe_chargeback_event", {
          target_event_id: event.id,
          target_dispute_id: dispute.id,
          target_charge_id: chargeId,
          target_amount_cents: dispute.amount,
        });
        if (error) throw error;
        break;
      }
      default:
        break;
    }

    await recordProcessed(admin, event, rawPayload);
    return jsonResponse({ received: true });
  } catch (error) {
    const signatureFailure = /signature|No signatures found|timestamp/i.test(errorMessage(error));
    if (signatureFailure) {
      console.error("Stripe webhook signature rejected", errorMessage(error));
      return jsonResponse({ error: "Invalid signature" }, 400);
    }
    console.error("Stripe webhook processing failed", error);
    return jsonResponse({ error: "Webhook processing failed" }, 500);
  }
});
