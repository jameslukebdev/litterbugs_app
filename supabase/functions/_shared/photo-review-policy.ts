export const PHOTO_REVIEW_POLICY_VERSION = "presume-eligible-2026-09-23";

type PhotoReviewDecision = {
  decision: "pass" | "better_photos" | "admin_review" | "fail";
  summary: string;
  reason_codes: string[];
};

// These codes represent concrete findings, not uncertainty or possible hazards.
const reviewReasons = new Set([
  "mismatched_location",
  "exact_original_photo_reuse",
  "hazardous_waste",
  "traffic_exposure",
  "private_property",
  "inaccessible_terrain",
  "suspected_manipulation",
]);

export function normalizePhotoReviewDecision(value: PhotoReviewDecision) {
  // Keep accepting legacy model responses, but never turn an AI rejection into
  // automatic report ineligibility. An administrator decides these cases.
  if (
    value.decision === "fail" ||
    value.reason_codes.some((code) => reviewReasons.has(code))
  ) {
    return { ...value, decision: "admin_review" as const };
  }
  return { ...value, decision: value.decision };
}
