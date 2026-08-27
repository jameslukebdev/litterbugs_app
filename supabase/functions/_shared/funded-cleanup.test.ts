import {
  createStripeOnboardingState,
  hasExactOriginalPhotoReuse,
  secureSecretEqual,
  verifyStripeOnboardingState,
} from "./funded-cleanup.ts";
import { geminiRelayConfig } from "./google-cloud.ts";
import {
  paymentIntentMatchesLedger,
  refundMatchesLedger,
  transferMatchesLedger,
} from "./stripe-reconciliation.ts";

Deno.test("Stripe onboarding state accepts its account and rejects tampering", async () => {
  Deno.env.set(
    "STRIPE_ONBOARDING_STATE_SECRET",
    "test-only-secret-that-is-long-enough",
  );
  try {
    const state = await createStripeOnboardingState("acct_test123");
    const verified = await verifyStripeOnboardingState(state);
    if (verified?.accountId !== "acct_test123") {
      throw new Error("Valid state was rejected");
    }

    const tampered = `${state.slice(0, -1)}${state.endsWith("a") ? "b" : "a"}`;
    if (await verifyStripeOnboardingState(tampered)) {
      throw new Error("Tampered state was accepted");
    }
  } finally {
    Deno.env.delete("STRIPE_ONBOARDING_STATE_SECRET");
  }
});

Deno.test("internal maintenance secrets reject mismatches", async () => {
  if (!await secureSecretEqual("correct-secret", "correct-secret")) {
    throw new Error("Matching secret was rejected");
  }
  if (await secureSecretEqual("wrong-secret", "correct-secret")) {
    throw new Error("Mismatched secret was accepted");
  }
  if (await secureSecretEqual(null, "correct-secret")) {
    throw new Error("Missing secret was accepted");
  }
});

Deno.test("Stripe contribution success requires the exact recorded charge", () => {
  const valid = {
    intentId: "pi_expected",
    intentAmountReceivedCents: 550,
    intentCurrency: "usd",
    intentTransferGroup: "cleanup_report_report-1",
    intentMetadata: {
      purpose: "cleanup_fund",
      report_id: "report-1",
      contributor_id: "member-1",
      client_request_id: "request-1",
      principal_amount_cents: "500",
      platform_fee_cents: "50",
    },
    ledgerPaymentIntentId: "pi_expected",
    ledgerReportId: "report-1",
    ledgerContributorId: "member-1",
    ledgerClientRequestId: "request-1",
    ledgerPrincipalCents: 500,
    ledgerFeeCents: 50,
    ledgerTotalCents: 550,
  };
  if (!paymentIntentMatchesLedger(valid)) {
    throw new Error("Exact contribution charge was rejected");
  }
  if (paymentIntentMatchesLedger({ ...valid, intentAmountReceivedCents: 500 })) {
    throw new Error("Wrong contribution total was accepted");
  }
  if (paymentIntentMatchesLedger({ ...valid, intentCurrency: "eur" })) {
    throw new Error("Wrong contribution currency was accepted");
  }
  if (paymentIntentMatchesLedger({
    ...valid,
    intentTransferGroup: "cleanup_report_report-2",
  })) {
    throw new Error("Wrong contribution transfer group was accepted");
  }
  if (paymentIntentMatchesLedger({
    ...valid,
    intentMetadata: { ...valid.intentMetadata, report_id: "report-2" },
  })) {
    throw new Error("Wrong contribution report was accepted");
  }
  if (paymentIntentMatchesLedger({
    ...valid,
    intentMetadata: { ...valid.intentMetadata, purpose: "other" },
  })) {
    throw new Error("Wrong contribution purpose was accepted");
  }
});

Deno.test("Stripe refund reconciliation requires the exact full charge", () => {
  const valid = {
    refundPaymentIntentId: "pi_expected",
    refundAmountCents: 550,
    refundCurrency: "usd",
    ledgerPaymentIntentId: "pi_expected",
    ledgerTotalCents: 550,
  };
  if (!refundMatchesLedger(valid)) throw new Error("Exact refund was rejected");
  if (refundMatchesLedger({ ...valid, refundAmountCents: 500 })) {
    throw new Error("Partial refund was accepted as complete");
  }
  if (refundMatchesLedger({ ...valid, refundPaymentIntentId: "pi_other" })) {
    throw new Error("Wrong PaymentIntent was accepted");
  }
});

Deno.test("Stripe transfer reconciliation requires the frozen reward and cleaner", () => {
  const valid = {
    transferId: "tr_expected",
    transferDestinationId: "acct_cleaner",
    transferAmountCents: 2500,
    transferCurrency: "usd",
    ledgerTransferId: null,
    ledgerDestinationId: "acct_cleaner",
    ledgerRewardCents: 2500,
  };
  if (!transferMatchesLedger(valid)) throw new Error("Exact transfer was rejected");
  if (transferMatchesLedger({ ...valid, transferDestinationId: "acct_other" })) {
    throw new Error("Wrong cleaner destination was accepted");
  }
  if (transferMatchesLedger({ ...valid, transferAmountCents: 2499 })) {
    throw new Error("Wrong transfer amount was accepted");
  }
  if (transferMatchesLedger({ ...valid, ledgerTransferId: "tr_other" })) {
    throw new Error("Conflicting transfer ID was accepted");
  }
});

Deno.test("Gemini relay requires an HTTPS origin and a strong shared secret", () => {
  Deno.env.set(
    "GEMINI_RELAY_URL",
    "https://gemini-relay.example",
  );
  Deno.env.set(
    "GEMINI_RELAY_SHARED_SECRET",
    "test-only-relay-secret-that-is-long-enough",
  );
  try {
    const config = geminiRelayConfig();
    if (
      config.endpoint !== "https://gemini-relay.example/v1/review" ||
      config.sharedSecret !== "test-only-relay-secret-that-is-long-enough"
    ) throw new Error("Gemini relay configuration was invalid");
  } finally {
    Deno.env.delete("GEMINI_RELAY_URL");
    Deno.env.delete("GEMINI_RELAY_SHARED_SECRET");
  }
});

Deno.test("paid cleanup exact-photo reuse is detected before Gemini review", () => {
  if (!hasExactOriginalPhotoReuse(
    ["original-a", "original-b"],
    ["cleanup-a", "original-b"],
  )) {
    throw new Error("Exact original-photo reuse was not detected");
  }
  if (hasExactOriginalPhotoReuse(
    ["original-a", "original-b"],
    ["cleanup-a", "cleanup-b"],
  )) {
    throw new Error("Distinct cleanup evidence was treated as an exact duplicate");
  }
});
