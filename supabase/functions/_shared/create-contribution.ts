import {
  authenticatedUser,
  corsHeaders,
  errorMessage,
  isUuid,
  jsonResponse,
  MAX_CLEANUP_CONTRIBUTION_CENTS,
  MIN_CLEANUP_CONTRIBUTION_CENTS,
  requiredEnv,
  serviceClient,
  stripeClient,
} from "./funded-cleanup.ts";

type RequestBody = {
  mode?: unknown;
  reportId?: unknown;
  principalAmountCents?: unknown;
  clientRequestId?: unknown;
  pricingVersion?: unknown;
};

export async function createContributionResponse(request: Request, dependencies = {
  authenticatedUser, serviceClient, stripeClient, requiredEnv,
}) {
  const { authenticatedUser, serviceClient, stripeClient, requiredEnv } = dependencies;
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const admin = serviceClient();
  const user = await authenticatedUser(request, admin);
  if (!user || user.is_anonymous) {
    return jsonResponse({ error: "A Litterbugs account is required" }, 401);
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request" }, 400);
  }

  const reportId = body.reportId;
  const clientRequestId = body.clientRequestId;
  const principalAmountCents = body.principalAmountCents;
  if (body.mode === 'quote') {
    if (!Number.isInteger(principalAmountCents)
      || Number(principalAmountCents) < MIN_CLEANUP_CONTRIBUTION_CENTS
      || Number(principalAmountCents) > MAX_CLEANUP_CONTRIBUTION_CENTS) {
      return jsonResponse({ error: 'Enter an amount from $1 to $1,000' }, 400);
    }
    const { data, error } = await admin.from('cleanup_pricing_config').select('pricing_version').eq('id', true).single();
    if (error || !data || ![1, 2].includes(data.pricing_version)) {
      return jsonResponse({ error: 'Pricing is temporarily unavailable. No payment has been made.' }, 503);
    }
    const principal = Number(principalAmountCents);
    const fee = Math.floor((principal + 5) / 10) + (data.pricing_version === 2 ? 50 : 0);
    // Read-only quote. Reservation rechecks this version under its pricing lock.
    return jsonResponse({ principalAmountCents: principal, platformFeeCents: fee,
      totalAmountCents: principal + fee, pricingVersion: data.pricing_version, currency: 'usd' });
  }
  if (
    !isUuid(reportId)
    || !isUuid(clientRequestId)
    || !Number.isInteger(principalAmountCents)
    || Number(principalAmountCents) < MIN_CLEANUP_CONTRIBUTION_CENTS
    || Number(principalAmountCents) > MAX_CLEANUP_CONTRIBUTION_CENTS
  ) {
    return jsonResponse({ error: "Enter an amount from $1 to $1,000" }, 400);
  }

  const stripe = stripeClient();
  try {
    const { data: contribution, error: reservationError } = await admin.rpc(
      "reserve_cleanup_contribution", {
        target_report_id: reportId,
        target_contributor_id: user.id,
        target_client_request_id: clientRequestId,
        principal_cents: Number(principalAmountCents),
        expected_pricing_version: body.pricingVersion === undefined ? 1 : body.pricingVersion,
        receipt_email: user.email ?? null,
      },
    );
    if (reservationError) throw reservationError;
    // Reuse the ledger's original PaymentIntent, even beyond Stripe's 24-hour
    // idempotency retention. Never recalculate prices for an existing payment.
    if (!contribution.stripe_payment_intent_id
      && Date.now() - Date.parse(contribution.created_at) > 23 * 60 * 60 * 1000) {
      return jsonResponse({ error: "Your earlier payment needs a status check. Open Payments or contact support before paying again." }, 409);
    }
    const paymentIntent = contribution.stripe_payment_intent_id
      ? await stripe.paymentIntents.retrieve(contribution.stripe_payment_intent_id)
      : await stripe.paymentIntents.create({
        amount: contribution.total_amount_cents,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        description: "Litterbugs cleanup fund contribution",
        ...(contribution.stripe_receipt_email ? { receipt_email: contribution.stripe_receipt_email } : {}),
        transfer_group: `cleanup_report_${reportId}`,
        metadata: {
          purpose: "cleanup_fund",
          report_id: reportId,
          contributor_id: user.id,
          client_request_id: clientRequestId,
          principal_amount_cents: String(contribution.principal_amount_cents),
          platform_fee_cents: String(contribution.platform_fee_cents),
          pricing_version: String(contribution.pricing_version),
        },
      }, { idempotencyKey: `cleanup-reservation-${contribution.id}` });

    if (paymentIntent.amount !== contribution.total_amount_cents
      || paymentIntent.currency !== "usd"
      || paymentIntent.metadata.report_id !== reportId
      || paymentIntent.metadata.contributor_id !== user.id
      || paymentIntent.metadata.client_request_id !== clientRequestId
      || paymentIntent.metadata.principal_amount_cents !== String(contribution.principal_amount_cents)
      || paymentIntent.metadata.platform_fee_cents !== String(contribution.platform_fee_cents)
      || Number(paymentIntent.metadata.pricing_version ?? 1) !== contribution.pricing_version) {
      throw new Error("cleanup_contribution_idempotency_mismatch");
    }
    if (!contribution.stripe_payment_intent_id) {
      const { error } = await admin.rpc("attach_cleanup_payment_intent", {
        target_contribution_id: contribution.id,
        payment_intent_id: paymentIntent.id,
      });
      if (error) throw error;
    }
    if (!paymentIntent.client_secret) throw new Error("Stripe did not return a client secret");
    if (!["requires_payment_method", "requires_confirmation", "requires_action"].includes(paymentIntent.status)) {
      return jsonResponse({ error: "This payment has already been submitted or closed. Check Payments before paying again." }, 409);
    }
    return jsonResponse({
      contributionId: contribution.id,
      paymentIntentClientSecret: paymentIntent.client_secret,
      publishableKey: requiredEnv("STRIPE_PUBLISHABLE_KEY"),
      principalAmountCents: contribution.principal_amount_cents,
      platformFeeCents: contribution.platform_fee_cents,
      totalAmountCents: contribution.total_amount_cents,
      pricingVersion: contribution.pricing_version,
      currency: "usd",
    });
  } catch (error) {
    const message = errorMessage(error);
    const pricingChanged = /cleanup_pricing_changed/i.test(message);
    const expected = /payments_disabled|financial_review_disabled|report_not_open_for_funding|cleanup_report_not_found|cleanup_contribution_idempotency_mismatch/i.test(message);
    console.error("Unable to create cleanup contribution", error);
    return jsonResponse({
      error: pricingChanged
        ? "Contribution pricing has changed. Refresh the website or update the app before starting a new payment. No payment has been made."
        : expected
        ? "This report is not accepting cleanup fund contributions right now"
        : "We couldn’t start the contribution. Please try again.",
    }, pricingChanged || expected ? 409 : 500);
  }
}
