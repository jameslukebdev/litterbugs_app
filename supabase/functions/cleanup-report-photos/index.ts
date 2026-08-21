import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.87.1";

type DeletePayload = {
  type?: unknown;
  table?: unknown;
  schema?: unknown;
  record?: unknown;
  old_record?: {
    id?: unknown;
    user_id?: unknown;
    photo_paths?: unknown;
  };
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  const candidateSecret = request.headers.get("x-report-cleanup-secret");
  if (!supabaseUrl || !serviceRoleKey || !candidateSecret) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: secretAccepted, error: secretError } = await admin.rpc(
    "verify_report_photo_cleanup_webhook",
    { candidate_secret: candidateSecret },
  );
  if (secretError || secretAccepted !== true) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  let payload: DeletePayload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const oldRecord = payload.old_record;
  const reportId = oldRecord?.id;
  const userId = oldRecord?.user_id;
  if (
    payload.type !== "DELETE" ||
    payload.table !== "reports" ||
    payload.schema !== "public" ||
    payload.record !== null ||
    typeof reportId !== "string" ||
    !uuidPattern.test(reportId) ||
    typeof userId !== "string" ||
    !uuidPattern.test(userId) ||
    !Array.isArray(oldRecord?.photo_paths)
  ) {
    return jsonResponse({ error: "Invalid report deletion payload" }, 400);
  }

  const prefix = `${userId}/${reportId}/`;
  const paths = [...new Set(oldRecord.photo_paths)]
    .filter((path): path is string =>
      typeof path === "string" &&
      path.startsWith(prefix) &&
      path.length > prefix.length &&
      !path.includes("..")
    );
  if (paths.length !== oldRecord.photo_paths.length || paths.length > 100) {
    return jsonResponse({ error: "Invalid report photo paths" }, 400);
  }

  const { data: existingReport, error: reportError } = await admin
    .from("reports")
    .select("id")
    .eq("id", reportId)
    .maybeSingle();
  if (reportError) {
    console.error("Unable to verify deleted report", reportError);
    return jsonResponse({ error: "Cleanup verification failed" }, 500);
  }
  if (existingReport) {
    return jsonResponse({ error: "Report still exists" }, 409);
  }

  for (let index = 0; index < paths.length; index += 100) {
    const { error } = await admin.storage
      .from("report_photos")
      .remove(paths.slice(index, index + 100));
    if (error) {
      console.error("Unable to remove report photos", error);
      return jsonResponse({ error: "Photo cleanup failed" }, 500);
    }
  }

  return jsonResponse({ removedPhotos: paths.length });
});
