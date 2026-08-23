import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.87.1";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  });

const removeInChunks = async (
  storage: ReturnType<typeof createClient>["storage"],
  paths: string[],
) => {
  for (let index = 0; index < paths.length; index += 100) {
    const { error } = await storage
      .from("report_photos")
      .remove(paths.slice(index, index + 100));

    if (error) throw error;
  }
};

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authorization = request.headers.get("Authorization");
  const accessToken = authorization?.replace(/^Bearer\s+/i, "");
  if (!accessToken) return jsonResponse({ error: "Authentication required" }, 401);

  let requestBody: { confirmation?: string } = {};
  try {
    requestBody = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request" }, 400);
  }

  if (requestBody.confirmation !== "DELETE") {
    return jsonResponse({ error: "Deletion was not confirmed" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Required Supabase function secrets are unavailable.");
    return jsonResponse({ error: "Account deletion is temporarily unavailable" }, 503);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  const user = userData.user;
  if (userError || !user) return jsonResponse({ error: "Authentication required" }, 401);

  try {
    const { data: reports, error: reportsError } = await admin
      .from("reports")
      .select("photo_paths")
      .eq("user_id", user.id);
    if (reportsError) throw reportsError;

    const attachedPaths = (reports ?? []).flatMap((report) =>
      Array.isArray(report.photo_paths) ? report.photo_paths : []
    );

    const { data: reportFolders, error: folderError } = await admin.storage
      .from("report_photos")
      .list(user.id, { limit: 1000 });
    if (folderError) throw folderError;

    const nestedPaths: string[] = [];
    for (const entry of reportFolders ?? []) {
      if (entry.id) {
        nestedPaths.push(`${user.id}/${entry.name}`);
        continue;
      }

      const reportFolder = `${user.id}/${entry.name}`;
      const { data: files, error: filesError } = await admin.storage
        .from("report_photos")
        .list(reportFolder, { limit: 1000 });
      if (filesError) throw filesError;

      nestedPaths.push(
        ...(files ?? [])
          .filter((file) => Boolean(file.id))
          .map((file) => `${reportFolder}/${file.name}`),
      );
    }

    const userPrefix = `${user.id}/`;
    const photoPaths = [...new Set([...attachedPaths, ...nestedPaths])]
      .filter((path) => typeof path === "string" && path.startsWith(userPrefix));
    await removeInChunks(admin.storage, photoPaths);

    const avatarPath = `${user.id}/avatar`;
    const { error: avatarError } = await admin.storage
      .from("profile_avatars")
      .remove([avatarPath]);
    if (avatarError) throw avatarError;

    const { count: anonymizedCount, error: anonymizeError } = await admin
      .from("reports")
      .update({
        user_id: null,
        photo_paths: null,
        title: null,
        types: null,
        notes_presets: null,
        notes_other: null,
      }, { count: "exact" })
      .eq("user_id", user.id);
    if (anonymizeError) throw anonymizeError;

    const { error: profileError } = await admin
      .from("profiles")
      .delete()
      .eq("id", user.id);
    if (profileError) throw profileError;

    const { error: signOutError } = await admin.auth.admin.signOut(accessToken, "global");
    if (signOutError) throw signOutError;

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return jsonResponse({
      deleted: true,
      anonymizedReports: anonymizedCount ?? 0,
      removedPhotos: photoPaths.length,
      removedProfileAvatar: true,
    });
  } catch (error) {
    console.error("Account deletion failed", error);
    return jsonResponse({ error: "We couldn’t delete the account. Please try again." }, 500);
  }
});
