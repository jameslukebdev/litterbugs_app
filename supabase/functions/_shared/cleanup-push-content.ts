export type CleanupPushDelivery = {
  delivery_id: string;
  notification_id: string;
  push_device_id: string;
  expo_push_token: string;
  event_type: string;
  report_id: string | null;
  cleanup_attempt_id: string | null;
  review_id: string | null;
  submission_id: string | null;
  issue_id?: string | null;
  /** Loaded for tip_received: amount, who sent it and their note. */
  tip?: { tip_amount_cents: number; tipper_name: string | null; note: string | null } | null;
};

export const notificationContent = (eventType: string) => {
  switch (eventType) {
    case "cleanup_issue_requested":
      return {
        title: "Cleanup needs information",
        body:
          "A cleaner sent you a question. View and reply at litterbugs.app.",
      };
    case "cleanup_issue_replied":
      return {
        title: "New cleanup response",
        body:
          "There is a response to your cleanup issue. Read it at litterbugs.app.",
      };
    case "cleanup_issue_resolved":
      return {
        title: "Cleanup issue resolved",
        body:
          "Your cleanup issue has been resolved. View it at litterbugs.app.",
      };
    case "cleanup_issue_report_updated":
      return {
        title: "Report updated",
        body:
          "The reporter updated the site information. Review it at litterbugs.app.",
      };
    case "admin_cleanup_needed":
      return {
        title: "Cleanup needs attention",
        body:
          "A cleanup or payment issue needs your review. Open your admin inbox.",
      };
    case "funded_cleanup_completed":
      return {
        title: "Cleanup you funded is complete",
        body:
          "A cleanup you helped fund has been approved. Thank you for supporting it!",
      };
    case "admin_moderation_needed":
      return {
        title: "Community report needs review",
        body:
          "A member sent a concern to the Litterbugs team. Open your admin inbox to review it.",
      };
    case "report_claimed":
      return {
        title: "Report claimed",
        body: "Your litter report has been claimed for cleanup.",
      };
    case "claim_expiring_soon":
      return {
        title: "Cleanup expires soon",
        body: "Your cleanup claim expires soon.",
      };
    case "claim_expired":
      return {
        title: "Cleanup claim expired",
        body:
          "Your cleanup claim expired and is available to other volunteers again.",
      };
    case "completion_submitted":
      return {
        title: "Cleanup ready for review",
        body: "A cleanup was submitted for your review.",
      };
    case "changes_requested":
      return {
        title: "Changes requested",
        body: "Changes were requested for your cleanup submission.",
      };
    case "cleanup_approved":
      return {
        title: "Cleanup approved",
        body:
          "Your cleanup was approved. Thanks for helping keep the community clean!",
      };
    case "cleanup_auto_approved":
      return {
        title: "Cleanup automatically approved",
        body: "Your cleanup was automatically approved.",
      };
    case "correction_expired":
      return {
        title: "Cleanup update window expired",
        body: "The report is available to other volunteers again.",
      };
    case "paid_review_started":
      return {
        title: "Funded cleanup ready for review",
        body:
          "Gemini accepted the photos. You have 48 hours to dispute the cleanup.",
      };
    case "paid_cleanup_disputed":
      return {
        title: "Cleanup disputed",
        body:
          "The payout is paused while an administrator reviews the cleanup.",
      };
    case "cleanup_reward_sent":
      return {
        title: "Cleanup reward sent",
        body: "Your cleanup reward was transferred to your Stripe account.",
      };
    case "cleanup_payout_failed":
      return {
        title: "Cleanup reward needs attention",
        body:
          "Your cleanup is approved, but the reward transfer needs administrator review.",
      };
    case "cleanup_fund_increased":
      return {
        title: "Cleanup fund increased",
        body: "A member added money to your report’s cleaner reward.",
      };
    case "cleanup_contribution_refunded":
      return {
        title: "Cleanup contribution refunded",
        body:
          "Your full cleanup contribution and Litterbugs fee were refunded.",
      };
    case "report_renewal_due":
      return {
        title: "Renew or close your litter report",
        body:
          "You have 7 days to renew it or its cleanup fund will be refunded.",
      };
    case "report_renewed":
      return {
        title: "Report renewed",
        body:
          "Your report and its cleanup fund are active for another 30 days.",
      };
    case "report_funding_photos_needed":
      return {
        title: "Better report photos needed",
        body:
          "Replace the original report photos before members can fund this cleanup.",
      };
    case "report_funding_review_required":
      return {
        title: "Cleanup fund safety review",
        body:
          "Your report needs a quick administrator safety review before funding can begin.",
      };
    case "report_funding_approved":
      return {
        title: "Cleanup funding approved",
        body:
          "Your report can now accept contributions. Adding funds is optional.",
      };
    case "tip_received":
      return {
        title: "You got a tip",
        body: "Someone thanked you with a tip. Open Litterbugs to see it.",
      };
    case "report_funding_rejected":
      return {
        title: "Cleanup funding unavailable",
        body: "Your report was reviewed and cannot accept cleanup funding.",
      };
    default:
      return null;
  }
};

export const isCleanupIssueEvent = (eventType: string) =>
  [
    "cleanup_issue_requested",
    "cleanup_issue_replied",
    "cleanup_issue_resolved",
    "cleanup_issue_report_updated",
  ].includes(eventType);

/** "Sarah tipped you $5.00", with their note as the message when they wrote one. */
export function tipPushContent(tip: NonNullable<CleanupPushDelivery["tip"]>) {
  const amount = `$${(tip.tip_amount_cents / 100).toFixed(2)}`;
  const from = tip.tipper_name?.trim() || "Someone";
  const note = tip.note?.trim();
  return {
    title: `${from} tipped you ${amount}`,
    body: note ? `\u201c${note}\u201d` : "Thank you for helping keep your community clean.",
  };
}

export function cleanupPushMessage(delivery: CleanupPushDelivery) {
  const content = delivery.event_type === "tip_received" && delivery.tip
    ? tipPushContent(delivery.tip)
    : notificationContent(delivery.event_type);
  if (!content) throw new Error("Unsupported cleanup notification event");
  const issue = isCleanupIssueEvent(delivery.event_type);
  const validId = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
  const issueId = delivery.issue_id && validId.test(delivery.issue_id)
    ? delivery.issue_id
    : null;
  return {
    to: delivery.expo_push_token,
    title: content.title,
    body: content.body,
    sound: "default",
    channelId: "cleanup-updates",
    data: {
      notificationId: delivery.notification_id,
      eventType: delivery.event_type,
      reportId: delivery.report_id,
      cleanupId: delivery.cleanup_attempt_id,
      reviewId: delivery.review_id,
      submissionId: delivery.submission_id,
      // Existing app versions retain their report destination. New clients can
      // use this authenticated website URL without exposing conversation text.
      ...(delivery.event_type === "tip_received"
        ? { url: "https://litterbugs.app/account/notifications" }
        : {}),
      ...(issue
        ? {
          issueId,
          url: issueId
            ? `https://litterbugs.app/account/cleanup-issues/${issueId}`
            : "https://litterbugs.app/account/notifications",
        }
        : {}),
    },
  };
}
