import {
  authenticatedUser,
  configureStripeRecipientAsIndividual,
  corsHeaders,
  createStripeRecipientOnboardingLink,
  jsonResponse,
  requiredEnv,
  LITTERBUGS_REWARD_ACTIVITY_DESCRIPTION,
  retrieveStripeRecipientAccount,
  serviceClient,
  stripeRecipientState,
  stripeClient,
  type StripeRecipientAccount,
  type StripeOnboardingReturnTarget,
  stripeV2,
} from "./funded-cleanup.ts";

const dependencies = {
  authenticatedUser, configureStripeRecipientAsIndividual, createStripeRecipientOnboardingLink,
  requiredEnv, retrieveStripeRecipientAccount, serviceClient, stripeClient, stripeV2,
};

export async function cleanerOnboardingResponse(request: Request, deps = dependencies) {
  const { authenticatedUser, configureStripeRecipientAsIndividual, createStripeRecipientOnboardingLink,
    requiredEnv, retrieveStripeRecipientAccount, serviceClient, stripeClient, stripeV2 } = deps;
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

  let body: { mode?: unknown; confirmAge18?: unknown; returnTarget?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request" }, 400);
  }
  const mode = body.mode === "session"
    ? "session"
    : body.mode === "status"
    ? "status"
    : body.mode === "dashboard"
      ? "dashboard"
      : "link";
  const returnTarget: StripeOnboardingReturnTarget = body.returnTarget === "web"
    ? "web"
    : "mobile";
  // Embedded payout setup runs on the website and, from app builds that carry Stripe's
  // embedded Connect components, inside the app. Both must say which they are.
  if (mode === "session" && body.returnTarget !== "web" && body.returnTarget !== "mobile") {
    return jsonResponse({ error: "Embedded payout setup needs a return target" }, 400);
  }
  if ((mode === "link" || mode === "session") && body.confirmAge18 !== true) {
    return jsonResponse({ error: "You must confirm that you are at least 18" }, 400);
  }

  try {
    // Check configuration before creating or changing an account. The secret key never leaves the server.
    const publishableKey = mode === "session" ? requiredEnv("STRIPE_PUBLISHABLE_KEY") : null;
    if (publishableKey && !/^pk_(live|test)_/.test(publishableKey)) throw new Error("Invalid Stripe publishable key");
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
      if (mode === "link" || mode === "session") {
        account = await configureStripeRecipientAsIndividual(account);
      }
    } else {
      account = await stripeV2<StripeRecipientAccount>("/core/accounts", {
        method: "POST",
        headers: { "Idempotency-Key": `litterbugs-cleaner-individual-${user.id}` },
        body: JSON.stringify({
          contact_email: user.email,
          display_name: user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? "Litterbugs member",
          defaults: {
            profile: { product_description: LITTERBUGS_REWARD_ACTIVITY_DESCRIPTION },
            responsibilities: {
              fees_collector: "application",
              losses_collector: "application",
            },
          },
          dashboard: "express",
          identity: {
            country: "us",
            entity_type: "individual",
          },
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
        age18Confirmed: Boolean(existing?.age_18_confirmed_at || body.confirmAge18 === true),
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

    if (mode === "session") {
      const stripe = stripeClient();
      // Cleaners do not sell a product. Keep their existing description, or supply the known
      // activity only when Stripe explicitly requires a missing description/website.
      // Checking requirements avoids overwriting a value Stripe has merely redacted.
      const profile = await stripe.accounts.retrieve(account.id);
      const activityDue = [
        ...(profile.requirements?.currently_due ?? []),
        ...(profile.requirements?.past_due ?? []),
        ...(profile.requirements?.eventually_due ?? []),
      ].some((field) => field === "business_profile.product_description" || field === "business_profile.url");
      if (!profile.business_profile?.product_description?.trim() && activityDue) {
        if (account.identity?.entity_type !== "individual") {
          throw new Error("Non-individual activity details need hosted onboarding");
        }
        await stripe.accounts.update(account.id, {
          business_profile: { product_description: LITTERBUGS_REWARD_ACTIVITY_DESCRIPTION },
        });
      }
      // Only the caller's server-owned payout account can receive this short-lived session.
      // Accounts v2 IDs work with AccountSessions v1; enable only onboarding, with Stripe authentication.
      const session = await stripe.accountSessions.create({
        account: account.id,
        components: {
          account_onboarding: {
            enabled: true,
            features: { external_account_collection: true, disable_stripe_user_authentication: false },
          },
        },
      });
      return jsonResponse({
        clientSecret: session.client_secret,
        expiresAt: session.expires_at,
        publishableKey,
        onboardingStatus: state.onboardingStatus,
        payoutsEnabled: state.payoutsEnabled,
      });
    }

    const link = await createStripeRecipientOnboardingLink(account.id, returnTarget);

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
}
