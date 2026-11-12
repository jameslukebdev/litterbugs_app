// What each cleanup notification says on the phone. The app and website show the same words in
// Updates (apps/mobile/lib/cleanupNotifications.js, apps/web/lib/cleanup-notifications.ts).

/** Every notification type the database can create (cleanup_notifications_event_type_check). */
export const NOTIFICATION_EVENT_TYPES = [
  "report_claimed", "claim_expiring_soon", "claim_expired", "completion_submitted", "changes_requested",
  "cleanup_approved", "cleanup_auto_approved", "correction_expired", "paid_review_started",
  "paid_cleanup_disputed", "cleanup_reward_sent", "cleanup_payout_failed", "cleanup_fund_increased",
  "cleanup_contribution_refunded", "report_renewal_due", "report_renewed", "report_funding_photos_needed",
  "report_funding_review_required", "report_funding_approved", "report_funding_rejected",
  "admin_moderation_needed", "admin_cleanup_needed", "funded_cleanup_completed", "nearby_reports_daily",
  "cleanup_completed_nearby",
] as const;

/** The opt-in nearby alerts have their own Android channel. */
export const notificationChannel = (eventType: string) =>
  eventType === "nearby_reports_daily" || eventType === "cleanup_completed_nearby" ? "nearby-reports" : "cleanup-updates";

export const notificationContent = (eventType: string): { title: string; body: string } | null => {
  switch (eventType) {
    case "admin_cleanup_needed":
      return { title: "Cleanup needs attention", body: "A cleanup or payment issue needs your review. Open your admin inbox." };
    case "funded_cleanup_completed":
      return { title: "Cleanup you funded is complete", body: "A cleanup you helped fund has been approved. Thank you for supporting it!" };
    case "admin_moderation_needed":
      return { title: "Community report needs review", body: "A member sent a concern to the Litterbugs team. Review it in your admin inbox." };
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
        body: "Your cleanup claim expired and is available to other volunteers again.",
      };
    case "completion_submitted":
      return {
        title: "Your spot was cleaned up",
        body: "Check the before and after photos, then approve the cleanup or ask for changes.",
      };
    case "changes_requested":
      return {
        title: "Changes requested",
        body: "Changes were requested for your cleanup submission.",
      };
    case "cleanup_approved":
      return {
        title: "Cleanup approved",
        body: "Your cleanup was approved. Thanks for helping keep the community clean!",
      };
    case "cleanup_auto_approved":
      return {
        title: "Cleanup automatically approved",
        body: "Your cleanup was automatically approved.",
      };
    case "correction_expired":
      return {
        title: "Cleanup update window expired",
        body: "The report is available to other volunteers again. Your earlier evidence remains in the cleanup history.",
      };
    case "paid_review_started":
      return {
        title: "Funded cleanup ready for review",
        body: "The cleanup photos passed review. You have 48 hours to report a problem.",
      };
    case "paid_cleanup_disputed":
      return {
        title: "Cleanup disputed",
        body: "The payout is paused while a Litterbugs team member reviews the cleanup.",
      };
    case "cleanup_reward_sent":
      return {
        title: "Cleanup reward sent",
        body: "Your cleanup reward was sent to your payout account.",
      };
    case "cleanup_payout_failed":
      return {
        title: "Cleanup reward needs attention",
        body: "Your cleanup is approved, but a Litterbugs team member needs to review the reward transfer.",
      };
    case "cleanup_fund_increased":
      return {
        title: "Cleanup fund increased",
        body: "A member added money to your report’s cleaner reward.",
      };
    case "cleanup_contribution_refunded":
      return {
        title: "Contribution refunded",
        body: "Your full cleanup contribution and Litterbugs fee were refunded.",
      };
    case "report_renewal_due":
      return {
        title: "Renew or close your report",
        body: "You have 7 days to renew it or its cleanup fund will be refunded.",
      };
    case "report_renewed":
      return {
        title: "Report renewed",
        body: "Your report and its cleanup fund are active for another 30 days.",
      };
    case "report_funding_photos_needed":
      return {
        title: "Better report photos needed",
        body: "Replace the original report photos before members can fund this cleanup.",
      };
    case "report_funding_review_required":
      return {
        title: "Cleanup fund safety review",
        body: "Your report needs a quick administrator safety review before funding can begin.",
      };
    case "report_funding_approved":
      return {
        title: "Cleanup funding approved",
        body: "Your report can now accept contributions. Adding funds is optional.",
      };
    case "report_funding_rejected":
      return {
        title: "Cleanup funding unavailable",
        body: "Your report was reviewed and cannot accept cleanup funding.",
      };
    case "nearby_reports_daily":
      return {
        title: "New litter near you",
        body: "New litter reports are available in your area for funding and cleanup.",
      };
    case "cleanup_completed_nearby":
      return {
        title: "Cleanup completed near you",
        body: "A cleanup has been completed in your area. Help celebrate the impact!",
      };
    default:
      return null;
  }
};
