import { deepStrictEqual, equal, match, throws } from "node:assert/strict";
import {
  type CleanupPushDelivery,
  cleanupPushMessage,
  isCleanupIssueEvent,
  notificationContent,
} from "./cleanup-push-content.ts";
import { cleanupNotificationDestination } from "../../../apps/mobile/lib/cleanupNotifications.js";
const notice: CleanupPushDelivery = {
  delivery_id: "11111111-1111-4111-8111-111111111111",
  notification_id: "22222222-2222-4222-8222-222222222222",
  push_device_id: "33333333-3333-4333-8333-333333333333",
  expo_push_token: "ExponentPushToken[synthetic-local-test]",
  event_type: "report_claimed",
  report_id: "44444444-4444-4444-8444-444444444444",
  cleanup_attempt_id: "55555555-5555-4555-8555-555555555555",
  review_id: null,
  submission_id: null,
};
const issueId = "66666666-6666-4666-8666-666666666666";
for (
  const event of [
    "cleanup_issue_requested",
    "cleanup_issue_replied",
    "cleanup_issue_resolved",
    "cleanup_issue_report_updated",
  ]
) {
  Deno.test(`${event}: useful alert, private website destination, unchanged-app report fallback`, () => {
    const message = cleanupPushMessage({
      ...notice,
      event_type: event,
      issue_id: issueId,
    });
    equal(isCleanupIssueEvent(event), true);
    match(message.body, /litterbugs\.app/);
    equal(
      message.data.url,
      `https://litterbugs.app/account/cleanup-issues/${issueId}`,
    );
    equal(message.data.issueId, issueId);
    equal(message.data.eventType, event);
    deepStrictEqual(cleanupNotificationDestination(message.data), {
      name: "App",
      label: "View Report",
      params: { screen: "Map", params: { reportId: notice.report_id } },
    });
    equal(JSON.stringify(message).includes("private message body"), false);
  });
}
Deno.test("legacy notification payload remains byte-for-byte compatible", () => {
  deepStrictEqual(cleanupPushMessage(notice), {
    to: notice.expo_push_token,
    title: "Report claimed",
    body: "Your litter report has been claimed for cleanup.",
    sound: "default",
    channelId: "cleanup-updates",
    data: {
      notificationId: notice.notification_id,
      eventType: "report_claimed",
      reportId: notice.report_id,
      cleanupId: notice.cleanup_attempt_id,
      reviewId: null,
      submissionId: null,
    },
  });
});
Deno.test("missing or malformed issue id uses authenticated website inbox, never an arbitrary URL", () => {
  for (const issue_id of [null, "https://evil.example/", "../../admin"]) {
    const message = cleanupPushMessage({
      ...notice,
      event_type: "cleanup_issue_replied",
      issue_id,
    });
    equal(message.data.issueId, null);
    equal(message.data.url, "https://litterbugs.app/account/notifications");
  }
});
Deno.test("unknown event remains unsupported", () => {
  equal(notificationContent("unknown"), null);
  equal(isCleanupIssueEvent("unknown"), false);
  throws(
    () => cleanupPushMessage({ ...notice, event_type: "unknown" }),
    /Unsupported/,
  );
});
