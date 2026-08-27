import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  createStripeRecipientOnboardingLink,
  serviceClient,
  verifyStripeOnboardingState,
} from "../_shared/funded-cleanup.ts";

const noStoreHeaders = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

const textResponse = (message: string, status: number) => new Response(message, {
  status,
  headers: { ...noStoreHeaders, "Content-Type": "text/plain; charset=utf-8" },
});

Deno.serve(async (request: Request) => {
  if (request.method !== "GET") return textResponse("Method not allowed", 405);

  const requestUrl = new URL(request.url);
  const mode = requestUrl.searchParams.get("mode");
  const signedState = requestUrl.searchParams.get("state") ?? "";
  if (mode !== "return" && mode !== "refresh") return textResponse("Invalid onboarding link", 400);

  const state = await verifyStripeOnboardingState(signedState);
  if (!state) return textResponse("This payout setup link has expired. Return to Litterbugs and try again.", 400);

  try {
    const admin = serviceClient();
    const { data: payoutAccount, error: payoutAccountError } = await admin
      .from("cleaner_payout_accounts")
      .select("stripe_account_id")
      .eq("stripe_account_id", state.accountId)
      .maybeSingle();
    if (payoutAccountError) throw payoutAccountError;
    if (!payoutAccount) return textResponse("Payout account not found", 404);

    if (mode === "return") {
      return new Response(null, {
        status: 302,
        headers: { ...noStoreHeaders, Location: "litterbugs://stripe-onboarding-return" },
      });
    }

    const { data: paymentsFlag, error: paymentsFlagError } = await admin
      .from("cleanup_feature_flags")
      .select("enabled")
      .eq("name", "payments_enabled")
      .single();
    if (paymentsFlagError) throw paymentsFlagError;
    if (!paymentsFlag.enabled) return textResponse("Cleanup payouts are not available yet", 409);

    const link = await createStripeRecipientOnboardingLink(state.accountId);
    return new Response(null, {
      status: 302,
      headers: { ...noStoreHeaders, Location: link.url },
    });
  } catch (error) {
    console.error("Stripe onboarding redirect failed", error);
    return textResponse("We couldn’t continue payout setup. Return to Litterbugs and try again.", 500);
  }
});
