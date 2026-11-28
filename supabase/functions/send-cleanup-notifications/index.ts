import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.87.1";

import {
  type CleanupPushDelivery,
  cleanupPushMessage,
  isCleanupIssueEvent,
  notificationContent,
} from "../_shared/cleanup-push-content.ts";

type ExpoPushTicket = {
  status?: unknown;
  id?: unknown;
  message?: unknown;
  details?: { error?: unknown };
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const expoPushUrl = "https://exp.host/--/api/v2/push/send";

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });

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

  let validDeliveries = deliveries.filter((delivery) =>
    notificationContent(delivery.event_type) !== null
  );
  const invalidDeliveries = deliveries.filter((delivery) =>
    notificationContent(delivery.event_type) === null
  );

  await Promise.all(
    invalidDeliveries.map((delivery) =>
      admin.rpc("complete_cleanup_push_delivery", {
        target_delivery_id: delivery.delivery_id,
        delivery_outcome: "failed",
        target_ticket_id: null,
        target_error_code: "unsupported_event",
        target_error_message: "Unsupported cleanup notification event.",
      })
    ),
  );

  // Keep the old queue RPC contract intact for all existing clients/workers.
  // Only new issue events need the service-only private destination lookup.
  const issueDeliveries = validDeliveries.filter((delivery) =>
    isCleanupIssueEvent(delivery.event_type)
  );
  let contextFailures = 0;
  if (issueDeliveries.length) {
    const { data: contexts, error } = await admin.rpc(
      "cleanup_issue_push_context",
      {
        notification_ids: issueDeliveries.map((delivery) =>
          delivery.notification_id
        ),
      },
    );
    if (error) {
      console.error(
        "Unable to load cleanup issue notification destinations",
        error,
      );
      contextFailures = issueDeliveries.length;
      await Promise.all(
        issueDeliveries.map((delivery) =>
          admin.rpc("complete_cleanup_push_delivery", {
            target_delivery_id: delivery.delivery_id,
            delivery_outcome: "failed",
            target_ticket_id: null,
            target_error_code: "issue_context_unavailable",
            target_error_message:
              "Cleanup issue destination temporarily unavailable.",
          })
        ),
      );
      validDeliveries = validDeliveries.filter((delivery) =>
        !isCleanupIssueEvent(delivery.event_type)
      );
    } else {
      const destinations = new Map(
        (contexts ?? []).map((
          row: { notification_id: string; issue_id: string | null },
        ) => [row.notification_id, row.issue_id]),
      );
      validDeliveries = validDeliveries.map((delivery) =>
        isCleanupIssueEvent(delivery.event_type)
          ? {
            ...delivery,
            issue_id: destinations.get(delivery.notification_id) as
              | string
              | null
              | undefined,
          }
          : delivery
      );
    }
  }
  if (validDeliveries.length === 0) {
    return jsonResponse({
      claimed: deliveries.length,
      accepted: 0,
      failed: invalidDeliveries.length + contextFailures,
    });
  }
  // Tip pushes name the amount, the sender and their note. If that lookup fails the
  // plain "You got a tip" message still goes out.
  const tipDeliveries = validDeliveries.filter((delivery) => delivery.event_type === "tip_received");
  if (tipDeliveries.length) {
    const { data: tipRows, error: tipError } = await admin.from("cleanup_notifications")
      .select("id, tip:cleaner_tips!cleanup_notifications_tip_id_fkey(tip_amount_cents, tipper_name, note)")
      .in("id", tipDeliveries.map((delivery) => delivery.notification_id));
    if (tipError) console.error("Unable to load tip details for push", tipError);
    type TipRow = { id: string; tip: CleanupPushDelivery["tip"] | NonNullable<CleanupPushDelivery["tip"]>[] };
    const tips = new Map(((tipRows ?? []) as unknown as TipRow[])
      .map((row) => [row.id, Array.isArray(row.tip) ? row.tip[0] ?? null : row.tip]));
    validDeliveries = validDeliveries.map((delivery) =>
      delivery.event_type === "tip_received" ? { ...delivery, tip: tips.get(delivery.notification_id) ?? null } : delivery
    );
  }
  const messages = validDeliveries.map(cleanupPushMessage);

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
    const message = error instanceof Error
      ? error.message
      : "Expo Push Service request failed";
    await Promise.all(
      validDeliveries.map((delivery) =>
        admin.rpc("complete_cleanup_push_delivery", {
          target_delivery_id: delivery.delivery_id,
          delivery_outcome: "failed",
          target_ticket_id: null,
          target_error_code: "expo_request_failed",
          target_error_message: message,
        })
      ),
    );
    console.error("Cleanup push request failed", error);
    return jsonResponse({
      claimed: deliveries.length,
      accepted: 0,
      failed: deliveries.length,
    }, 502);
  }

  let accepted = 0;
  let failed = invalidDeliveries.length + contextFailures;

  await Promise.all(tickets.map(async (ticket, index) => {
    const delivery = validDeliveries[index];
    const errorCode = typeof ticket.details?.error === "string"
      ? ticket.details.error
      : null;
    const ticketId = typeof ticket.id === "string" ? ticket.id : null;
    const ticketMessage = typeof ticket.message === "string"
      ? ticket.message
      : null;
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
