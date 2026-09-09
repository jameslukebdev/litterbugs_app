import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { authenticatedUser, corsHeaders, isUuid, jsonResponse, serviceClient, stripeClient } from "../_shared/funded-cleanup.ts";
import { reconcileSuccessfulPaymentIntent } from "../_shared/reconcile-payment.ts";
Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
  const admin = serviceClient();
  const user = await authenticatedUser(request, admin);
  if (!user || user.is_anonymous) return jsonResponse({ error: "Sign in to check this payment" }, 401);
  try {
    const { contributionId } = await request.json();
    if (!isUuid(contributionId)) return jsonResponse({ error: "Invalid payment reference" }, 400);
    const { data: row, error } = await admin.from("cleanup_contributions").select("id,contributor_id,report_id,status,stripe_payment_intent_id,client_request_id,total_amount_cents")
      .eq("id", contributionId).eq("contributor_id", user.id).maybeSingle();
    if (error) throw error;
    if (!row) return jsonResponse({ error: "Payment unavailable" }, 404);
    const intent = await stripeClient().paymentIntents.retrieve(row.stripe_payment_intent_id);
    if (intent.metadata.contributor_id !== user.id || intent.metadata.client_request_id !== row.client_request_id || intent.amount !== row.total_amount_cents || intent.currency !== "usd") throw new Error("Payment identity mismatch");
    if (intent.status === "succeeded") await reconcileSuccessfulPaymentIntent(admin, intent);
    else if (intent.status === "canceled") {
      const { error: finalizeError } = await admin.rpc("finalize_cleanup_contribution", {
        payment_intent_id: intent.id, charge_id: null, payment_succeeded: false, payment_failure_code: "payment_intent.canceled",
      });
      if (finalizeError) throw finalizeError;
    }
    return jsonResponse({ providerState: intent.status, checkedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Contribution status verification failed", error instanceof Error ? error.message : "unknown");
    return jsonResponse({ error: "We couldn’t verify this payment yet. Please retry before making another payment." }, 503);
  }
});
