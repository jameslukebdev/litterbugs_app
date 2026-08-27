import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  authenticatedUser,
  corsHeaders,
  errorMessage,
  isUuid,
  jsonResponse,
  requiredEnv,
  serviceClient,
  stripeClient,
} from "../_shared/funded-cleanup.ts";

type RequestBody = {
  reportId?: unknown;
  principalAmountCents?: unknown;
  clientRequestId?: unknown;
};

Deno.serve(async (request: Request) => {
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
  if (
    !isUuid(reportId)
    || !isUuid(clientRequestId)
    || !Number.isInteger(principalAmountCents)
    || Number(principalAmountCents) < 500
    || Number(principalAmountCents) > 500_000
  ) {
    return jsonResponse({ error: "Enter an amount from $5 to $5,000" }, 400);
  }

  const principal = Number(principalAmountCents);
  const fee = Math.floor((principal + 5) / 10);
  const total = principal + fee;

  const { data: featureFlags, error: featureFlagsError } = await admin
    .from("cleanup_feature_flags")
    .select("name, enabled")
    .in("name", ["payments_enabled", "gemini_financial_review_enabled"]);
  if (featureFlagsError) {
    console.error("Unable to read cleanup feature flags", featureFlagsError);
    return jsonResponse({ error: "We couldn’t start the contribution. Please try again." }, 500);
  }
  const enabledFlags = new Set(
    (featureFlags ?? []).filter((flag) => flag.enabled).map((flag) => flag.name),
  );
  if (
    !enabledFlags.has("payments_enabled")
    || !enabledFlags.has("gemini_financial_review_enabled")
  ) {
    return jsonResponse({
      error: "This report is not accepting cleanup fund contributions right now",
    }, 409);
  }

  const stripe = stripeClient();
  let paymentIntentId: string | null = null;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: total,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      description: "Litterbugs cleanup fund contribution",
      receipt_email: user.email,
      transfer_group: `cleanup_report_${reportId}`,
      metadata: {
        purpose: "cleanup_fund",
        report_id: reportId,
        contributor_id: user.id,
        client_request_id: clientRequestId,
        principal_amount_cents: String(principal),
        platform_fee_cents: String(fee),
      },
    }, { idempotencyKey: `cleanup-contribution-${user.id}-${clientRequestId}` });
    paymentIntentId = paymentIntent.id;

    const { data: contribution, error } = await admin.rpc(
      "create_cleanup_contribution_intent",
      {
        target_report_id: reportId,
        target_contributor_id: user.id,
        target_client_request_id: clientRequestId,
        principal_cents: principal,
        payment_intent_id: paymentIntent.id,
      },
    );
    if (error) throw error;
    if (!paymentIntent.client_secret) throw new Error("Stripe did not return a client secret");

    return jsonResponse({
      contributionId: contribution.id,
      paymentIntentClientSecret: paymentIntent.client_secret,
      publishableKey: requiredEnv("STRIPE_PUBLISHABLE_KEY"),
      principalAmountCents: principal,
      platformFeeCents: fee,
      totalAmountCents: total,
      currency: "usd",
    });
  } catch (error) {
    const message = errorMessage(error);
    const expected = /payments_disabled|financial_review_disabled|report_not_open_for_funding/i.test(message);
    if (paymentIntentId && expected) {
      try {
        await stripe.paymentIntents.cancel(paymentIntentId);
      } catch (cancelError) {
        console.error("Unable to cancel unused PaymentIntent", cancelError);
      }
    }
    console.error("Unable to create cleanup contribution", error);
    return jsonResponse({
      error: expected
        ? "This report is not accepting cleanup fund contributions right now"
        : "We couldn’t start the contribution. Please try again.",
    }, expected ? 409 : 500);
  }
});
