import Stripe from "npm:stripe@22.5.0";
import {
  authenticatedUser,
  corsHeaders,
  errorMessage,
  isUuid,
  jsonResponse,
  requiredEnv,
  retrieveStripeRecipientAccount,
  serviceClient,
  stripeClient,
  stripeRecipientState,
} from "./funded-cleanup.ts";

export const MIN_TIP_CENTS = 300;
export const MAX_TIP_CENTS = 100_000;

/** Service fee added on top of the tip: 50¢ plus 5% (rounded to the nearest cent). The cleaner gets 100% of the tip. */
export const tipFeeCents = (tipCents: number) => 50 + Math.floor((tipCents + 10) / 20);

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

type TipRow = {
  id: string;
  cleaner_id: string | null;
  client_request_id: string;
  tip_amount_cents: number;
  platform_fee_cents: number;
  total_amount_cents: number;
  stripe_destination_account_id: string;
  stripe_payment_intent_id: string | null;
  status: string;
};

const tipColumns = "id, cleaner_id, client_request_id, tip_amount_cents, platform_fee_cents, total_amount_cents, stripe_destination_account_id, stripe_payment_intent_id, status";

export async function createCleanerTipResponse(request: Request, dependencies = {
  authenticatedUser, serviceClient, stripeClient, requiredEnv, retrieveStripeRecipientAccount,
}) {
  const { authenticatedUser, serviceClient, stripeClient, requiredEnv, retrieveStripeRecipientAccount } = dependencies;
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  let body: { cleanerId?: unknown; tipAmountCents?: unknown; clientRequestId?: unknown; receiptEmail?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request" }, 400);
  }
  const { cleanerId, tipAmountCents, clientRequestId } = body;
  if (!isUuid(cleanerId) || !isUuid(clientRequestId)) return jsonResponse({ error: "Invalid request" }, 400);
  if (!Number.isInteger(tipAmountCents) || Number(tipAmountCents) < MIN_TIP_CENTS || Number(tipAmountCents) > MAX_TIP_CENTS) {
    return jsonResponse({ error: "Enter a tip from $3 to $1,000" }, 400);
  }
  const tipCents = Number(tipAmountCents);

  const admin = serviceClient();
  // Guests can tip. A signed-in (non-anonymous) member is recorded as the tipper.
  const user = await authenticatedUser(request, admin).catch(() => null);
  const tipper = user && !user.is_anonymous ? user : null;
  const typedEmail = typeof body.receiptEmail === "string" ? body.receiptEmail.trim() : "";
  const receiptEmail = typedEmail || tipper?.email || "";
  if (!EMAIL.test(receiptEmail) || receiptEmail.length > 254) {
    return jsonResponse({ error: "Enter an email for your receipt" }, 400);
  }
  if (tipper?.id === cleanerId) return jsonResponse({ error: "You can’t tip yourself" }, 400);

  try {
    const [{ data: flag, error: flagError }, { data: payout, error: payoutError }, { data: recipient, error: recipientError }] = await Promise.all([
      admin.from("cleanup_feature_flags").select("enabled").eq("name", "tips_enabled").maybeSingle(),
      admin.from("cleaner_payout_accounts")
        .select("stripe_account_id, onboarding_status, payouts_enabled, country, age_18_confirmed_at")
        .eq("user_id", cleanerId).maybeSingle(),
      admin.rpc("tip_recipient", { target_profile_id: cleanerId }).maybeSingle(),
    ]);
    if (flagError || payoutError || recipientError) throw flagError ?? payoutError ?? recipientError;
    if (!flag?.enabled) return jsonResponse({ error: "Tips aren’t available yet" }, 409);
    const accountId = payout?.stripe_account_id;
    if (!recipient || !payout || !accountId || payout.onboarding_status !== "enabled" || !payout.payouts_enabled
      || payout.country !== "US" || !payout.age_18_confirmed_at) {
      return jsonResponse({ error: "This cleaner can’t receive tips right now" }, 409);
    }
    // The ledger can lag Stripe; confirm the cleaner can receive money before anyone is charged.
    if (!stripeRecipientState(await retrieveStripeRecipientAccount(accountId)).payoutsEnabled) {
      return jsonResponse({ error: "This cleaner can’t receive tips right now" }, 409);
    }

    const fee = tipFeeCents(tipCents);
    const { error: insertError } = await admin.from("cleaner_tips").insert({
      cleaner_id: cleanerId,
      tipper_id: tipper?.id ?? null,
      client_request_id: clientRequestId,
      tip_amount_cents: tipCents,
      platform_fee_cents: fee,
      total_amount_cents: tipCents + fee,
      stripe_destination_account_id: accountId,
    });
    if (insertError && insertError.code !== "23505") throw insertError;
    const { data: tip, error: tipError } = await admin.from("cleaner_tips").select(tipColumns)
      .eq("client_request_id", clientRequestId).single<TipRow>();
    if (tipError) throw tipError;
    // A retried request must describe the same tip; never reprice an existing one.
    if (tip.cleaner_id !== cleanerId || tip.tip_amount_cents !== tipCents || tip.status !== "pending") {
      return jsonResponse({ error: "This tip was already started. Refresh the page to begin a new one." }, 409);
    }

    const stripe = stripeClient();
    const name = (recipient as { name?: string }).name ?? "a Litterbugs cleaner";
    const intent = tip.stripe_payment_intent_id
      ? await stripe.paymentIntents.retrieve(tip.stripe_payment_intent_id)
      : await stripe.paymentIntents.create({
        amount: tip.total_amount_cents,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        // Destination charge: the tip goes straight to the cleaner; Litterbugs keeps only the fee.
        application_fee_amount: tip.platform_fee_cents,
        transfer_data: { destination: tip.stripe_destination_account_id },
        description: `Tip for ${name} on Litterbugs`,
        receipt_email: receiptEmail,
        metadata: {
          purpose: "cleaner_tip",
          tip_id: tip.id,
          cleaner_id: cleanerId,
          tip_amount_cents: String(tip.tip_amount_cents),
          platform_fee_cents: String(tip.platform_fee_cents),
        },
      }, { idempotencyKey: `cleaner-tip-${tip.id}` });
    if (!intentMatchesTip(intent, tip)) throw new Error("cleaner_tip_idempotency_mismatch");
    if (!tip.stripe_payment_intent_id) {
      const { error } = await admin.from("cleaner_tips")
        .update({ stripe_payment_intent_id: intent.id, updated_at: new Date().toISOString() })
        .eq("id", tip.id).is("stripe_payment_intent_id", null);
      if (error) throw error;
    }
    if (!intent.client_secret || !["requires_payment_method", "requires_confirmation", "requires_action"].includes(intent.status)) {
      return jsonResponse({ error: "This tip has already been paid or closed. Refresh the page to start a new one." }, 409);
    }
    return jsonResponse({
      tipId: tip.id,
      clientSecret: intent.client_secret,
      publishableKey: requiredEnv("STRIPE_PUBLISHABLE_KEY"),
      tipAmountCents: tip.tip_amount_cents,
      platformFeeCents: tip.platform_fee_cents,
      totalAmountCents: tip.total_amount_cents,
    });
  } catch (error) {
    console.error("Unable to start cleaner tip", errorMessage(error));
    return jsonResponse({ error: "We couldn’t start your tip. No payment has been made. Please try again." }, 500);
  }
}

const intentMatchesTip = (intent: Stripe.PaymentIntent, tip: TipRow) => {
  const destination = typeof intent.transfer_data?.destination === "string"
    ? intent.transfer_data.destination : intent.transfer_data?.destination?.id;
  return intent.amount === tip.total_amount_cents
    && intent.currency === "usd"
    && intent.application_fee_amount === tip.platform_fee_cents
    && destination === tip.stripe_destination_account_id
    && intent.metadata?.purpose === "cleaner_tip"
    && intent.metadata?.tip_id === tip.id
    && intent.metadata?.tip_amount_cents === String(tip.tip_amount_cents)
    && intent.metadata?.platform_fee_cents === String(tip.platform_fee_cents);
};

/** Webhook: record a tip payment's outcome. Throws for unknown tip intents so Stripe retries. */
export async function reconcileCleanerTipPaymentIntent(
  admin: ReturnType<typeof serviceClient>,
  intent: Stripe.PaymentIntent,
  succeeded: boolean,
  failureCode: string | null = null,
) {
  const { data: tip, error } = await admin.from("cleaner_tips").select(tipColumns)
    .eq("stripe_payment_intent_id", intent.id).maybeSingle<TipRow>();
  if (error) throw error;
  if (!tip) throw new Error("cleaner_tip_not_found");
  if (!intentMatchesTip(intent, tip)) throw new Error("Stripe PaymentIntent details did not match the Litterbugs tip ledger");
  if (succeeded && intent.amount_received !== tip.total_amount_cents) throw new Error("cleaner_tip_amount_mismatch");
  const chargeId = typeof intent.latest_charge === "string" ? intent.latest_charge : intent.latest_charge?.id ?? null;
  const now = new Date().toISOString();
  const { error: updateError } = await admin.from("cleaner_tips")
    .update(succeeded
      ? { status: "succeeded", stripe_charge_id: chargeId, paid_at: now, failure_code: null, updated_at: now }
      : { status: "failed", failure_code: failureCode, updated_at: now })
    .eq("id", tip.id)
    .in("status", succeeded ? ["pending", "failed"] : ["pending"]);
  if (updateError) throw updateError;
}

/** Webhook: mark a tip refunded once Stripe confirms the refund. Returns false when the refund isn't for a tip. */
export async function reconcileCleanerTipRefund(admin: ReturnType<typeof serviceClient>, refund: Stripe.Refund) {
  const intentId = typeof refund.payment_intent === "string" ? refund.payment_intent : refund.payment_intent?.id;
  if (!intentId) return false;
  const { data: tip, error } = await admin.from("cleaner_tips").select("id")
    .eq("stripe_payment_intent_id", intentId).maybeSingle<{ id: string }>();
  if (error) throw error;
  if (!tip) return false;
  if (refund.status === "succeeded") {
    const now = new Date().toISOString();
    const { error: updateError } = await admin.from("cleaner_tips")
      .update({ status: "refunded", refunded_at: now, updated_at: now })
      .eq("id", tip.id).eq("status", "succeeded");
    if (updateError) throw updateError;
  }
  return true;
}
