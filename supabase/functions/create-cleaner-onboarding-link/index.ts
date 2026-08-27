import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  authenticatedUser,
  corsHeaders,
  createStripeRecipientOnboardingLink,
  jsonResponse,
  retrieveStripeRecipientAccount,
  serviceClient,
  stripeRecipientState,
  stripeClient,
  type StripeRecipientAccount,
  stripeV2,
} from "../_shared/funded-cleanup.ts";

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const admin = serviceClient();
  const user = await authenticatedUser(request, admin);
  if (!user || user.is_anonymous) return jsonResponse({ error: "Authentication required" }, 401);

  const { data: paymentsFlag, error: paymentsFlagError } = await admin
    .from("cleanup_feature_flags")
    .select("enabled")
    .eq("name", "payments_enabled")
    .single();
  if (paymentsFlagError) {
    console.error("Unable to read payments feature flag", paymentsFlagError);
    return jsonResponse({ error: "We couldn’t open payout setup. Please try again." }, 500);
  }
  if (!paymentsFlag.enabled) {
    return jsonResponse({ error: "Cleanup payouts are not available yet" }, 409);
  }

  let body: { mode?: unknown; confirmAge18?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request" }, 400);
  }
  const mode = body.mode === "status"
    ? "status"
    : body.mode === "dashboard"
      ? "dashboard"
      : "link";
  if (mode === "link" && body.confirmAge18 !== true) {
    return jsonResponse({ error: "You must confirm that you are at least 18" }, 400);
  }

  try {
    const { data: existing, error: existingError } = await admin
      .from("cleaner_payout_accounts")
      .select("stripe_account_id, age_18_confirmed_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existingError) throw existingError;

    if (mode === "status" && !existing?.stripe_account_id) {
      return jsonResponse({
        onboardingStatus: "not_started",
        payoutsEnabled: false,
        requirementsDue: [],
      });
    }

    let account: StripeRecipientAccount;
    if (existing?.stripe_account_id) {
      account = await retrieveStripeRecipientAccount(existing.stripe_account_id);
    } else {
      account = await stripeV2<StripeRecipientAccount>("/core/accounts", {
        method: "POST",
        headers: { "Idempotency-Key": `litterbugs-cleaner-${user.id}` },
        body: JSON.stringify({
          contact_email: user.email,
          display_name: user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? "Litterbugs cleaner",
          defaults: {
            responsibilities: {
              fees_collector: "application",
              losses_collector: "application",
            },
          },
          dashboard: "express",
          identity: { country: "us" },
          configuration: {
            recipient: {
              capabilities: {
                stripe_balance: { stripe_transfers: { requested: true } },
              },
            },
          },
          include: ["configuration.recipient", "identity", "requirements"],
        }),
      });
    }

    const state = stripeRecipientState(account);
    const { error: syncError } = await admin.rpc("sync_cleaner_payout_account", {
      target_user_id: user.id,
      target_stripe_account_id: account.id,
      target_onboarding_status: state.onboardingStatus,
      target_payouts_enabled: state.payoutsEnabled,
      target_country: "US",
      target_requirements_due: state.requirementsDue,
    });
    if (syncError) throw syncError;

    if (body.confirmAge18 === true && !existing?.age_18_confirmed_at) {
      const { error: ageError } = await admin
        .from("cleaner_payout_accounts")
        .update({ age_18_confirmed_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (ageError) throw ageError;
    }

    if (mode === "status") {
      return jsonResponse({
        onboardingStatus: state.onboardingStatus,
        payoutsEnabled: state.payoutsEnabled,
        requirementsDue: state.requirementsDue,
      });
    }

    if (mode === "dashboard" && state.payoutsEnabled) {
      const loginLink = await stripeClient().accounts.createLoginLink(account.id);
      return jsonResponse({
        url: loginLink.url,
        onboardingStatus: state.onboardingStatus,
        payoutsEnabled: state.payoutsEnabled,
      });
    }
    if (mode === "dashboard") {
      return jsonResponse({ error: "Finish payout onboarding before opening the dashboard" }, 409);
    }

    const link = await createStripeRecipientOnboardingLink(account.id);

    return jsonResponse({
      url: link.url,
      expiresAt: link.expires_at,
      onboardingStatus: state.onboardingStatus,
      payoutsEnabled: state.payoutsEnabled,
    });
  } catch (error) {
    console.error("Cleaner onboarding failed", error);
    return jsonResponse({ error: "We couldn’t open payout setup. Please try again." }, 500);
  }
});
