import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  authenticatedUser,
  corsHeaders,
  errorMessage,
  hasExactOriginalPhotoReuse,
  isUuid,
  jsonResponse,
  requiredEnv,
  secureSecretEqual,
  serviceClient,
  stripeClient,
} from "../_shared/funded-cleanup.ts";
import { geminiRelayConfig } from "../_shared/google-cloud.ts";

type AiCheck = {
  id: string;
  report_id: string;
  cleanup_attempt_id: string | null;
  submission_id: string | null;
  check_kind: "report" | "paid_submission";
  attempt_number: number;
  provider_attempts: number;
  provider_started_at: string | null;
  prompt_version: "report-funding-v1" | "funded-cleanup-v1";
};

type GeminiDecision = {
  decision: "pass" | "better_photos" | "admin_review" | "fail";
  summary: string;
  reason_codes: string[];
};

const reasonCodes = [
  "usable",
  "blurry",
  "poor_framing",
  "insufficient_coverage",
  "cleanup_incomplete",
  "mismatched_location",
  "exact_original_photo_reuse",
  "hazardous_waste",
  "traffic_exposure",
  "private_property",
  "inaccessible_terrain",
  "suspected_manipulation",
  "ambiguous",
] as const;
const reasonCodeSet = new Set<string>(reasonCodes);

const mandatoryAdminReasonCodes = new Set<string>([
  "mismatched_location",
  "exact_original_photo_reuse",
  "hazardous_waste",
  "traffic_exposure",
  "private_property",
  "inaccessible_terrain",
  "suspected_manipulation",
]);

const isTransientStripeError = (error: unknown) => {
  const type = error && typeof error === "object" && "type" in error
    ? String(error.type)
    : "";
  return new Set([
    "StripeAPIError",
    "StripeConnectionError",
    "StripeRateLimitError",
  ]).has(type);
};

const loadImagePart = async (
  admin: ReturnType<typeof serviceClient>,
  bucket: string,
  path: string,
) => {
  const { data, error } = await admin.storage.from(bucket).download(path);
  if (error || !data) throw error ?? new Error("Photo unavailable");
  if (data.size > 5 * 1024 * 1024) {
    throw new Error("Photo exceeds the 5 MB review limit");
  }
  const bytes = new Uint8Array(await data.arrayBuffer());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
  const mimeType = data.type || "image/jpeg";
  if (![
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ].includes(mimeType)) {
    throw new Error("Photo type is not supported for automated review");
  }
  const { data: signed, error: signedError } = await admin.storage.from(bucket)
    .createSignedUrl(path, 5 * 60);
  if (signedError || !signed?.signedUrl) {
    throw signedError ?? new Error("Private photo reference unavailable");
  }
  return {
    hash,
    part: {
      photoUrl: signed.signedUrl,
      mimeType,
    },
  };
};

const callGemini = async (
  parts: unknown[],
  promptVersion: AiCheck["prompt_version"],
): Promise<GeminiDecision> => {
  const relay = geminiRelayConfig();
  const response = await fetch(relay.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${relay.sharedSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ promptVersion, parts }),
    signal: AbortSignal.timeout(58_000),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Gemini relay returned HTTP ${response.status}`);
  }
  const parsed = payload as GeminiDecision;
  if (
    !["pass", "better_photos", "admin_review", "fail"].includes(
      parsed.decision,
    ) ||
    typeof parsed.summary !== "string" || parsed.summary.length < 1 ||
    parsed.summary.length > 800 || !Array.isArray(parsed.reason_codes) ||
    parsed.reason_codes.length > 6 ||
    parsed.reason_codes.some((code) => !reasonCodeSet.has(code))
  ) throw new Error("Gemini returned an invalid decision");
  return parsed;
};

const processAiCheck = async (
  admin: ReturnType<typeof serviceClient>,
  requestedCheckId?: string,
) => {
  const staleBefore = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: staleCheck, error: staleError } = await admin.from(
    "cleanup_ai_checks",
  )
    .select("id, provider_attempts")
    .eq("status", "running")
    .lt("provider_started_at", staleBefore)
    .order("provider_started_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (staleError) throw staleError;
  if (staleCheck) {
    const { error: recoverError } = await admin.from("cleanup_ai_checks")
      .update({
        status: "queued",
        provider_started_at: null,
        last_provider_error:
          "Automated review worker was interrupted; retrying.",
      })
      .eq("id", staleCheck.id)
      .eq("status", "running");
    if (recoverError) throw recoverError;
  }

  let query = admin.from("cleanup_ai_checks")
    .select(
      "id, report_id, cleanup_attempt_id, submission_id, check_kind, attempt_number, provider_attempts, provider_started_at, prompt_version",
    )
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1);
  if (requestedCheckId) query = query.eq("id", requestedCheckId);
  const { data: queued, error: queueError } = await query.maybeSingle();
  if (queueError) throw queueError;
  if (!queued) return null;
  const check = queued as AiCheck;

  if (check.provider_attempts >= 3) {
    const { error: resultError } = await admin.rpc("record_cleanup_ai_result", {
      target_check_id: check.id,
      result_status: "failed",
      result_model: "gemini-3.7-flash",
      result_image_hashes: [],
      result_summary:
        "Automated photo review was unavailable after several attempts. An administrator will review the submission.",
      result_reason_codes: ["ambiguous"],
      result_raw: { provider_error: true },
    });
    if (resultError) throw resultError;
    return {
      checkId: check.id,
      status: "failed",
      summary: "Automated photo review was unavailable after several attempts.",
    };
  }

  const { data: claimed, error: claimError } = await admin
    .from("cleanup_ai_checks")
    .update({
      status: "running",
      provider_attempts: check.provider_attempts + 1,
      provider_started_at: new Date().toISOString(),
      last_provider_error: null,
    })
    .eq("id", check.id)
    .eq("status", "queued")
    .select("id")
    .maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) return null;

  try {
    const { data: report, error: reportError } = await admin
      .from("reports")
      .select(
        "title, severity, litter_types, notes_presets, notes_other, photo_paths",
      )
      .eq("id", check.report_id)
      .single();
    if (reportError) throw reportError;

    const parts: unknown[] = [{
      text: check.check_kind === "report"
        ? `Review this original litter report for a usable photo, obvious fraud, and cleanup safety. Report metadata: ${
          JSON.stringify({
            title: report.title,
            severity: report.severity,
            litterTypes: report.litter_types,
            notes: report.notes_presets,
            other: report.notes_other,
          })
        }`
        : `Compare the original report photos followed by the cleanup submission photos. Decide whether the litter appears materially cleaned, whether the photos plausibly show the same location, and whether better photos are needed. This is photo attempt ${check.attempt_number} of 3. For ordinary blur, framing, or insufficient coverage on attempts 1 and 2, request better_photos instead of escalating. On attempt 3, unresolved ambiguity should use admin_review. This decision gates a financial reward.`,
    }];
    const hashes: string[] = [];
    const reportHashes: string[] = [];
    const cleanupHashes: string[] = [];

    for (const path of report.photo_paths ?? []) {
      const image = await loadImagePart(admin, "report_photos", path);
      hashes.push(image.hash);
      reportHashes.push(image.hash);
      parts.push(image.part);
    }

    if (check.check_kind === "paid_submission" && check.submission_id) {
      const { data: photos, error: photosError } = await admin
        .from("cleanup_submission_photos")
        .select("storage_path")
        .eq("submission_id", check.submission_id)
        .order("display_order");
      if (photosError) throw photosError;
      parts.push({ text: "Cleanup submission photos begin here." });
      for (const photo of photos ?? []) {
        const image = await loadImagePart(
          admin,
          "cleanup_photos",
          photo.storage_path,
        );
        hashes.push(image.hash);
        cleanupHashes.push(image.hash);
        parts.push(image.part);
      }
    }

    if (hashes.length === 0) {
      parts.push({ text: "No usable image was available." });
    }
    const exactOriginalReuse = hasExactOriginalPhotoReuse(
      reportHashes,
      cleanupHashes,
    );
    let decision: GeminiDecision;
    if (check.check_kind === "paid_submission" && exactOriginalReuse) {
      decision = {
        decision: "admin_review",
        summary:
          "A cleanup photo is an exact duplicate of an original report photo, so an administrator must review the evidence.",
        reason_codes: ["exact_original_photo_reuse"],
      };
    } else {
      decision = await callGemini(parts, check.prompt_version);
      if (
        decision.decision !== "admin_review" &&
        decision.decision !== "fail" &&
        decision.reason_codes.some((code) =>
          mandatoryAdminReasonCodes.has(code)
        )
      ) {
        decision = { ...decision, decision: "admin_review" };
      }
    }
    const status = decision.decision === "pass"
      ? "passed"
      : decision.decision === "fail"
      ? "failed"
      : decision.decision;
    const { error: resultError } = await admin.rpc("record_cleanup_ai_result", {
      target_check_id: check.id,
      result_status: status,
      result_model: "gemini-3.7-flash",
      result_image_hashes: hashes,
      result_summary: decision.summary,
      result_reason_codes: decision.reason_codes,
      result_raw: decision,
    });
    if (resultError) throw resultError;
    await admin.from("cleanup_ai_checks")
      .update({ provider_started_at: null })
      .eq("id", check.id);
    return { checkId: check.id, status, summary: decision.summary };
  } catch (error) {
    const providerAttempt = check.provider_attempts + 1;
    const providerError = errorMessage(error).slice(0, 500);
    if (providerAttempt >= 3) {
      const { error: resultError } = await admin.rpc(
        "record_cleanup_ai_result",
        {
          target_check_id: check.id,
          result_status: "failed",
          result_model: "gemini-3.7-flash",
          result_image_hashes: [],
          result_summary:
            "Automated photo review was unavailable after several attempts. An administrator will review the submission.",
          result_reason_codes: ["ambiguous"],
          result_raw: { provider_error: true },
        },
      );
      if (resultError) throw resultError;
      await admin.from("cleanup_ai_checks")
        .update({ provider_started_at: null })
        .eq("id", check.id);
      return {
        checkId: check.id,
        status: "failed",
        summary:
          "Automated photo review was unavailable after several attempts.",
      };
    } else {
      await admin.from("cleanup_ai_checks")
        .update({
          status: "queued",
          provider_started_at: null,
          last_provider_error: providerError,
        })
        .eq("id", check.id)
        .eq("status", "running");
      throw error;
    }
  }
};

const processRefund = async (admin: ReturnType<typeof serviceClient>) => {
  const { data: contribution, error } = await admin.rpc(
    "claim_cleanup_refund_operation",
  );
  if (error) throw error;
  if (!contribution) return null;

  let refund;
  try {
    refund = await stripeClient().refunds.create({
      payment_intent: contribution.stripe_payment_intent_id,
      amount: contribution.total_amount_cents,
      metadata: { cleanup_contribution_id: contribution.id },
    }, {
      idempotencyKey:
        `cleanup-refund-${contribution.id}-${contribution.refund_attempts}`,
    });
  } catch (refundError) {
    if (isTransientStripeError(refundError)) {
      await admin.from("cleanup_contributions").update({
        refund_processing_started_at: new Date(Date.now() - 6 * 60 * 1000)
          .toISOString(),
      }).eq("id", contribution.id).eq("status", "refund_processing");
    } else {
      await admin.rpc("mark_cleanup_refund_result", {
        target_contribution_id: contribution.id,
        refund_succeeded: false,
        target_refund_id: null,
        target_error: errorMessage(refundError),
      });
    }
    throw refundError;
  }

  const succeeded = refund.status === "succeeded";
  const failed = refund.status === "failed" || refund.status === "canceled";
  const { error: markError } = succeeded || failed
    ? await admin.rpc("mark_cleanup_refund_result", {
      target_contribution_id: contribution.id,
      refund_succeeded: succeeded,
      target_refund_id: refund.id,
      target_error: failed
        ? refund.failure_reason ?? `Stripe refund ${refund.status}`
        : null,
    })
    : await admin.rpc("mark_cleanup_refund_processing", {
      target_contribution_id: contribution.id,
      target_refund_id: refund.id,
    });
  if (markError) throw markError;
  return {
    contributionId: contribution.id,
    status: succeeded ? "refunded" : failed ? "failed" : "processing",
  };
};

const processPayout = async (admin: ReturnType<typeof serviceClient>) => {
  const { data: attempt, error } = await admin.rpc(
    "claim_cleanup_payout_operation",
  );
  if (error) throw error;
  if (!attempt) return null;

  const { data: payoutAccount, error: accountError } = await admin
    .from("cleaner_payout_accounts")
    .select("stripe_account_id, payouts_enabled")
    .eq("user_id", attempt.cleaner_id)
    .single();
  if (accountError) throw accountError;
  if (!payoutAccount.payouts_enabled || !payoutAccount.stripe_account_id) {
    const payoutError = new Error("Cleaner payout account is not enabled");
    const { error: markError } = await admin.rpc("mark_cleanup_payout_result", {
      target_cleanup_id: attempt.id,
      transfer_succeeded: false,
      target_transfer_id: null,
      target_error: payoutError.message,
    });
    if (markError) throw markError;
    throw payoutError;
  }

  let transfer;
  try {
    transfer = await stripeClient().transfers.create({
      amount: attempt.reward_amount_cents,
      currency: "usd",
      destination: payoutAccount.stripe_account_id,
      transfer_group: `cleanup_report_${attempt.report_id}`,
      metadata: {
        cleanup_attempt_id: attempt.id,
        report_id: attempt.report_id,
      },
    }, {
      idempotencyKey: `cleanup-payout-${attempt.id}-${attempt.payout_attempts}`,
    });
  } catch (transferError) {
    if (isTransientStripeError(transferError)) {
      await admin.from("cleanup_attempts").update({
        last_activity_at: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
      }).eq("id", attempt.id).eq("payout_status", "processing");
    } else {
      await admin.rpc("mark_cleanup_payout_result", {
        target_cleanup_id: attempt.id,
        transfer_succeeded: false,
        target_transfer_id: null,
        target_error: errorMessage(transferError),
      });
    }
    throw transferError;
  }

  const { error: markError } = await admin.rpc("mark_cleanup_payout_result", {
    target_cleanup_id: attempt.id,
    transfer_succeeded: true,
    target_transfer_id: transfer.id,
    target_error: null,
  });
  if (markError) throw markError;
  return { cleanupId: attempt.id, status: "transferred" };
};

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const admin = serviceClient();
  const candidateSecret = request.headers.get("x-financial-maintenance-secret");
  const configuredSecret = Deno.env.get("FINANCIAL_MAINTENANCE_SECRET");
  const internal = await secureSecretEqual(candidateSecret, configuredSecret);
  const user = internal ? null : await authenticatedUser(request, admin);
  if (!internal && (!user || user.is_anonymous)) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  let body: { checkId?: unknown; reportId?: unknown; cleanupId?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request" }, 400);
  }
  let requestedCheckId = isUuid(body.checkId) ? body.checkId : undefined;
  const requestedReportId = isUuid(body.reportId) ? body.reportId : undefined;
  const requestedCleanupId = isUuid(body.cleanupId)
    ? body.cleanupId
    : undefined;

  if (!requestedCheckId && (requestedReportId || requestedCleanupId)) {
    let checkQuery = admin.from("cleanup_ai_checks")
      .select("id")
      .eq("status", "queued")
      .order("created_at", { ascending: false })
      .limit(1);
    checkQuery = requestedCleanupId
      ? checkQuery.eq("cleanup_attempt_id", requestedCleanupId)
      : checkQuery.eq("report_id", requestedReportId!).is(
        "cleanup_attempt_id",
        null,
      );
    const { data: targetCheck } = await checkQuery.maybeSingle();
    requestedCheckId = targetCheck?.id;
  }

  if (!internal) {
    if (!requestedCheckId) return jsonResponse({ pending: false });
    const { data: check } = await admin.from("cleanup_ai_checks")
      .select("report_id, cleanup_attempt_id")
      .eq("id", requestedCheckId)
      .maybeSingle();
    if (!check) return jsonResponse({ error: "Review check not found" }, 404);
    const [{ data: report }, { data: attempt }] = await Promise.all([
      admin.from("reports").select("user_id").eq("id", check.report_id)
        .maybeSingle(),
      check.cleanup_attempt_id
        ? admin.from("cleanup_attempts").select("cleaner_id, reporter_id").eq(
          "id",
          check.cleanup_attempt_id,
        ).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    if (
      report?.user_id !== user!.id &&
      attempt?.cleaner_id !== user!.id &&
      attempt?.reporter_id !== user!.id
    ) return jsonResponse({ error: "Review not allowed" }, 403);
  }

  const results: Record<string, unknown> = {};
  try {
    const { data: flags, error: flagsError } = await admin.from(
      "cleanup_feature_flags",
    )
      .select("name, enabled")
      .in("name", ["gemini_financial_review_enabled", "payments_enabled"]);
    if (flagsError) throw flagsError;
    const enabled = new Map(
      (flags ?? []).map((flag) => [flag.name, flag.enabled]),
    );
    const geminiEnabled =
      enabled.get("gemini_financial_review_enabled") === true;
    const paymentsEnabled = enabled.get("payments_enabled") === true;
    if (geminiEnabled) {
      results.ai = await processAiCheck(admin, requestedCheckId);
    }
    if (internal && paymentsEnabled) {
      results.refund = await processRefund(admin);
      results.payout = await processPayout(admin);
    }
    return jsonResponse(results);
  } catch (error) {
    console.error("Financial maintenance task failed", error);
    return jsonResponse({
      error: "Financial maintenance is temporarily unavailable",
    }, 500);
  }
});
