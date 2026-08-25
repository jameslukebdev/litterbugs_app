import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.87.1";

type CleanupPushDelivery = {
  delivery_id: string;
  notification_id: string;
  push_device_id: string;
  expo_push_token: string;
  event_type: string;
  report_id: string;
  cleanup_attempt_id: string;
  review_id: string | null;
  submission_id: string | null;
};

type ExpoPushTicket = {
  status?: unknown;
  id?: unknown;
  message?: unknown;
  details?: { error?: unknown };
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const expoPushUrl = "https://exp.host/--/api/v2/push/send";

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });

const notificationContent = (eventType: string) => {
  switch (eventType) {
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
        body: "The report is available to other volunteers again.",
      };
    default:
      return null;
  }
};

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const candidateSecret = request.headers.get("x-cleanup-push-secret");
  if (!supabaseUrl || !serviceRoleKey || !candidateSecret) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: secretAccepted, error: secretError } = await admin.rpc(
    "verify_cleanup_push_webhook",
    { candidate_secret: candidateSecret },
  );
  if (secretError || secretAccepted !== true) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  let body: { notificationId?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const notificationId = body.notificationId;
  if (
    notificationId !== null &&
    notificationId !== undefined &&
    (typeof notificationId !== "string" || !uuidPattern.test(notificationId))
  ) {
    return jsonResponse({ error: "Invalid notification" }, 400);
  }

  const { data: claimedData, error: claimError } = await admin.rpc(
    "claim_cleanup_push_deliveries",
    {
      target_notification_id: notificationId ?? null,
      batch_limit: 100,
    },
  );
  if (claimError) {
    console.error("Unable to claim cleanup push deliveries", claimError);
    return jsonResponse({ error: "Push queue unavailable" }, 500);
  }

  const deliveries = (claimedData ?? []) as CleanupPushDelivery[];
  if (deliveries.length === 0) {
    return jsonResponse({ claimed: 0, accepted: 0, failed: 0 });
  }

  const validDeliveries = deliveries.filter((delivery) =>
    notificationContent(delivery.event_type) !== null
  );
  const invalidDeliveries = deliveries.filter((delivery) =>
    notificationContent(delivery.event_type) === null
  );

  await Promise.all(invalidDeliveries.map((delivery) =>
    admin.rpc("complete_cleanup_push_delivery", {
      target_delivery_id: delivery.delivery_id,
      delivery_outcome: "failed",
      target_ticket_id: null,
      target_error_code: "unsupported_event",
      target_error_message: "Unsupported cleanup notification event.",
    })
  ));

  if (validDeliveries.length === 0) {
    return jsonResponse({
      claimed: deliveries.length,
      accepted: 0,
      failed: invalidDeliveries.length,
    });
  }

  const messages = validDeliveries.map((delivery) => {
    const content = notificationContent(delivery.event_type)!;
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
      },
    };
  });

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Accept-Encoding": "gzip, deflate",
    "Content-Type": "application/json",
  };
  const expoAccessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  if (expoAccessToken) headers.Authorization = `Bearer ${expoAccessToken}`;

  let tickets: ExpoPushTicket[];
  try {
    const response = await fetch(expoPushUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(messages),
    });
    const responseBody = await response.json();
    if (!response.ok || !Array.isArray(responseBody?.data)) {
      throw new Error(`Expo Push Service returned HTTP ${response.status}`);
    }
    tickets = responseBody.data;
    if (tickets.length !== validDeliveries.length) {
      throw new Error("Expo Push Service returned an incomplete ticket batch");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Expo Push Service request failed";
    await Promise.all(validDeliveries.map((delivery) =>
      admin.rpc("complete_cleanup_push_delivery", {
        target_delivery_id: delivery.delivery_id,
        delivery_outcome: "failed",
        target_ticket_id: null,
        target_error_code: "expo_request_failed",
        target_error_message: message,
      })
    ));
    console.error("Cleanup push request failed", error);
    return jsonResponse({
      claimed: deliveries.length,
      accepted: 0,
      failed: deliveries.length,
    }, 502);
  }

  let accepted = 0;
  let failed = invalidDeliveries.length;

  await Promise.all(tickets.map(async (ticket, index) => {
    const delivery = validDeliveries[index];
    const errorCode = typeof ticket.details?.error === "string"
      ? ticket.details.error
      : null;
    const ticketId = typeof ticket.id === "string" ? ticket.id : null;
    const ticketMessage = typeof ticket.message === "string" ? ticket.message : null;
    const outcome = ticket.status === "ok"
      ? "accepted"
      : errorCode === "DeviceNotRegistered"
        ? "device_unregistered"
        : "failed";

    if (outcome === "accepted") accepted += 1;
    else failed += 1;

    const { error } = await admin.rpc("complete_cleanup_push_delivery", {
      target_delivery_id: delivery.delivery_id,
      delivery_outcome: outcome,
      target_ticket_id: ticketId,
      target_error_code: errorCode,
      target_error_message: ticketMessage,
    });
    if (error) console.error("Unable to finalize cleanup push delivery", error);
  }));

  return jsonResponse({
    claimed: deliveries.length,
    accepted,
    failed,
  });
});
