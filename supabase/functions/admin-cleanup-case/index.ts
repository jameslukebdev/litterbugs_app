import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  authenticatedUser,
  corsHeaders,
  isUuid,
  jsonResponse,
  serviceClient,
  userClient,
} from "../_shared/funded-cleanup.ts";

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const admin = serviceClient();
  const user = await authenticatedUser(request, admin);
  if (!user || user.is_anonymous) return jsonResponse({ error: "Authentication required" }, 401);

  let body: {
    operation?: unknown;
    status?: unknown;
    caseId?: unknown;
    action?: unknown;
    reason?: unknown;
  } = {};
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request" }, 400);
  }

  const client = userClient(request);
  try {
    if (body.operation === "list") {
      const status = body.status === "resolved" ? "resolved" : "open";
      const { data, error } = await client.rpc("list_cleanup_admin_cases", {
        target_status: status,
      });
      if (error) throw error;
      return jsonResponse({ cases: data });
    }

    if (body.operation === "get" && isUuid(body.caseId)) {
      const { data, error } = await client.rpc("get_cleanup_admin_case", {
        target_case_id: body.caseId,
      });
      if (error) throw error;
      const detail = data as Record<string, unknown>;
      const report = detail.report as { photo_paths?: string[] | null } | null;
      const submissions = Array.isArray(detail.submissions)
        ? detail.submissions as Array<{ id?: string }>
        : [];
      const reportPaths = report?.photo_paths ?? [];
      const submissionIds = submissions.map(({ id }) => id).filter((id): id is string => Boolean(id));
      const { data: cleanupPhotos, error: photoError } = submissionIds.length
        ? await admin.from("cleanup_submission_photos")
          .select("submission_id, storage_path, display_order")
          .in("submission_id", submissionIds)
          .order("display_order")
        : { data: [], error: null };
      if (photoError) throw photoError;
      const cleanupPaths = (cleanupPhotos ?? []).map(({ storage_path }) => storage_path);
      const [{ data: reportUrls }, { data: cleanupUrls }] = await Promise.all([
        reportPaths.length
          ? admin.storage.from("report_photos").createSignedUrls(reportPaths, 60 * 30)
          : Promise.resolve({ data: [] }),
        cleanupPaths.length
          ? admin.storage.from("cleanup_photos").createSignedUrls(cleanupPaths, 60 * 30)
          : Promise.resolve({ data: [] }),
      ]);
      return jsonResponse({
        ...detail,
        photos: {
          before: (reportUrls ?? []).map(({ signedUrl }) => signedUrl).filter(Boolean),
          after: (cleanupUrls ?? []).map(({ signedUrl }) => signedUrl).filter(Boolean),
        },
      });
    }

    if (
      body.operation === "resolve"
      && isUuid(body.caseId)
      && typeof body.action === "string"
      && typeof body.reason === "string"
    ) {
      const { data, error } = await client.rpc("resolve_cleanup_admin_case", {
        target_case_id: body.caseId,
        target_action: body.action,
        target_reason: body.reason,
      });
      if (error) throw error;
      return jsonResponse(data);
    }

    return jsonResponse({ error: "Invalid admin operation" }, 400);
  } catch (error) {
    console.error("Admin cleanup case operation failed", error);
    const message = error instanceof Error ? error.message : String(error);
    if (/cleanup_admin_mfa_required|permission denied|insufficient_privilege/i.test(message)) {
      return jsonResponse({ error: "Admin access with MFA is required" }, 403);
    }
    return jsonResponse({ error: "The admin action could not be completed" }, 500);
  }
});
